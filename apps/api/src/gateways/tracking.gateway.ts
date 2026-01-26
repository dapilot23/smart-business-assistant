import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../config/prisma/prisma.service';
import { RouteOptimizationService } from '../modules/ai-scheduling/route-optimization.service';

interface LocationUpdate {
  technicianId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  status?: 'IDLE' | 'EN_ROUTE' | 'ON_SITE' | 'BREAK' | 'OFFLINE';
}

interface JobStatusUpdate {
  jobId: string;
  status: string;
  message?: string;
  photoUrl?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure for production
  },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private technicianSockets: Map<string, string> = new Map(); // technicianId -> socketId
  private customerSockets: Map<string, Set<string>> = new Map(); // jobId -> Set<socketId>

  constructor(
    private readonly prisma: PrismaService,
    private readonly routeOptimization: RouteOptimizationService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up technician mapping
    for (const [techId, socketId] of this.technicianSockets.entries()) {
      if (socketId === client.id) {
        this.technicianSockets.delete(techId);
        break;
      }
    }

    // Clean up customer subscriptions
    for (const [jobId, sockets] of this.customerSockets.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.customerSockets.delete(jobId);
      }
    }
  }

  // ============================================
  // Technician Events
  // ============================================

  @SubscribeMessage('technician:register')
  handleTechnicianRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { technicianId: string; tenantId: string },
  ) {
    this.technicianSockets.set(data.technicianId, client.id);
    client.join(`tenant:${data.tenantId}`);
    client.join(`technician:${data.technicianId}`);

    this.logger.log(`Technician registered: ${data.technicianId}`);
    return { success: true };
  }

  @SubscribeMessage('technician:location')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationUpdate & { tenantId: string },
  ) {
    try {
      // Save location to database
      await this.routeOptimization.updateTechnicianLocation(
        data.technicianId,
        data.tenantId,
        {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          heading: data.heading,
          speed: data.speed,
        },
        data.status,
      );

      // Broadcast to relevant customers watching this technician's jobs
      const activeJobs = await this.getActiveTechnicianJobs(data.technicianId);

      for (const job of activeJobs) {
        // Broadcast to customers tracking this job
        this.server.to(`job:${job.id}`).emit('technician:location', {
          jobId: job.id,
          technicianId: data.technicianId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          status: data.status,
          timestamp: new Date().toISOString(),
        });

        // Calculate and send ETA if customer location is known
        const customerLocation = await this.getCustomerLocation(job.appointment.customerId);
        if (customerLocation) {
          const eta = await this.routeOptimization.calculateETA(
            data.technicianId,
            customerLocation.latitude!,
            customerLocation.longitude!,
          );

          if (eta) {
            this.server.to(`job:${job.id}`).emit('eta:update', {
              jobId: job.id,
              estimatedMinutes: eta.minutes,
              distance: eta.distance,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      // Broadcast to dispatchers
      this.server.to(`tenant:${data.tenantId}`).emit('technician:location', {
        technicianId: data.technicianId,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Location update failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('job:status')
  async handleJobStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JobStatusUpdate & { tenantId: string },
  ) {
    try {
      // Update job status in database
      await this.prisma.job.update({
        where: { id: data.jobId },
        data: { status: data.status as any },
      });

      // Create status history entry
      // Broadcast to customer
      this.server.to(`job:${data.jobId}`).emit('job:status', {
        jobId: data.jobId,
        status: data.status,
        message: data.message,
        photoUrl: data.photoUrl,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to dispatchers
      this.server.to(`tenant:${data.tenantId}`).emit('job:status', {
        jobId: data.jobId,
        status: data.status,
        message: data.message,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Job status update failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // Customer Events
  // ============================================

  @SubscribeMessage('customer:track')
  async handleCustomerTrack(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string; customerId: string },
  ) {
    // Verify customer owns this job
    const job = await this.prisma.job.findFirst({
      where: {
        id: data.jobId,
        appointment: { customerId: data.customerId },
      },
      include: {
        technician: { select: { id: true, name: true } },
        appointment: {
          include: {
            service: { select: { name: true } },
            customer: {
              include: { location: true },
            },
          },
        },
      },
    });

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    // Subscribe to job updates
    client.join(`job:${data.jobId}`);

    // Track socket for cleanup
    if (!this.customerSockets.has(data.jobId)) {
      this.customerSockets.set(data.jobId, new Set());
    }
    this.customerSockets.get(data.jobId)!.add(client.id);

    // Send current status
    let technicianLocation: {
      latitude: number;
      longitude: number;
      status: string;
      recordedAt: Date;
    } | null = null;
    let eta: { estimatedMinutes: number; distance: number } | null = null;

    if (job.technicianId) {
      const currentLocation = await this.routeOptimization.getTechnicianLocation(job.technicianId);

      if (currentLocation) {
        technicianLocation = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          status: currentLocation.status,
          recordedAt: currentLocation.recordedAt,
        };

        if (job.appointment.customer.location) {
          const customerLoc = job.appointment.customer.location;
          if (customerLoc.latitude && customerLoc.longitude) {
            const etaResult = await this.routeOptimization.calculateETA(
              job.technicianId,
              customerLoc.latitude,
              customerLoc.longitude,
            );
            if (etaResult) {
              eta = {
                estimatedMinutes: etaResult.minutes,
                distance: etaResult.distance,
              };
            }
          }
        }
      }
    }

    this.logger.log(`Customer tracking job: ${data.jobId}`);

    return {
      success: true,
      job: {
        id: job.id,
        status: job.status,
        technician: job.technician,
        service: job.appointment.service?.name,
        scheduledAt: job.appointment.scheduledAt,
      },
      technicianLocation,
      eta,
    };
  }

  @SubscribeMessage('customer:untrack')
  handleCustomerUntrack(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    client.leave(`job:${data.jobId}`);

    const sockets = this.customerSockets.get(data.jobId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.customerSockets.delete(data.jobId);
      }
    }

    return { success: true };
  }

  // ============================================
  // Dispatcher Events
  // ============================================

  @SubscribeMessage('dispatcher:register')
  handleDispatcherRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; userId: string },
  ) {
    client.join(`tenant:${data.tenantId}`);
    client.join(`dispatcher:${data.userId}`);

    this.logger.log(`Dispatcher registered: ${data.userId}`);
    return { success: true };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async getActiveTechnicianJobs(technicianId: string) {
    return this.prisma.job.findMany({
      where: {
        technicianId,
        status: { in: ['EN_ROUTE', 'IN_PROGRESS'] },
      },
      include: {
        appointment: {
          select: { customerId: true },
        },
      },
    });
  }

  private async getCustomerLocation(customerId: string) {
    return this.prisma.customerLocation.findUnique({
      where: { customerId },
    });
  }

  // Public method for external use (e.g., from services)
  broadcastJobUpdate(jobId: string, data: any) {
    this.server.to(`job:${jobId}`).emit('job:update', data);
  }

  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }
}
