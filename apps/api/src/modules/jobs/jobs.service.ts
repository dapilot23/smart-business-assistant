import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { StorageService } from '../../config/storage/storage.service';
import { EventsService } from '../../config/events/events.service';
import { EVENTS, JobEventPayload } from '../../config/events/events.types';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { CompleteJobDto } from './dto/complete-job.dto';
import { JobFilterDto } from './dto/job-filter.dto';
import { JobStatus, JobPhotoType } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly eventsService: EventsService,
  ) {}

  async getJobs(tenantId: string, filters?: JobFilterDto) {
    const where: any = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.technicianId) {
      where.technicianId = filters.technicianId;
    }

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return this.prisma.job.findMany({
      where,
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
        technician: {
          select: { id: true, name: true, email: true },
        },
        photos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getJob(tenantId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
        technician: {
          select: { id: true, name: true, email: true },
        },
        photos: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return job;
  }

  async createJobFromAppointment(tenantId: string, dto: CreateJobDto) {
    const appointment = await this.validateAppointment(tenantId, dto.appointmentId);

    const existingJob = await this.prisma.job.findUnique({
      where: { appointmentId: dto.appointmentId },
    });

    if (existingJob) {
      throw new BadRequestException('Job already exists for this appointment');
    }

    if (dto.technicianId) {
      await this.validateTechnician(tenantId, dto.technicianId);
    }

    const job = await this.prisma.job.create({
      data: {
        tenantId,
        appointmentId: dto.appointmentId,
        technicianId: dto.technicianId || appointment.assignedTo,
        notes: dto.notes,
        status: JobStatus.NOT_STARTED,
      },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
        technician: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.eventsService.emit<JobEventPayload>(
      EVENTS.JOB_CREATED,
      this.buildJobPayload(tenantId, job),
    );

    return job;
  }

  async updateJobStatus(
    tenantId: string,
    jobId: string,
    dto: UpdateJobStatusDto,
  ) {
    await this.getJob(tenantId, jobId);

    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: dto.status },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
        technician: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async startJob(tenantId: string, jobId: string) {
    await this.getJob(tenantId, jobId);

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
        technician: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.eventsService.emit<JobEventPayload>(
      EVENTS.JOB_STARTED,
      this.buildJobPayload(tenantId, job),
    );

    return job;
  }

  async completeJob(
    tenantId: string,
    jobId: string,
    dto: CompleteJobDto,
  ) {
    await this.getJob(tenantId, jobId);

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        workSummary: dto.workSummary,
        materialsUsed: dto.materialsUsed,
      },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
        technician: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.eventsService.emit<JobEventPayload>(
      EVENTS.JOB_COMPLETED,
      this.buildJobPayload(tenantId, job),
    );

    return job;
  }

  async addJobNotes(tenantId: string, jobId: string, notes: string) {
    const job = await this.getJob(tenantId, jobId);

    const updatedNotes = job.notes
      ? `${job.notes}\n\n${notes}`
      : notes;

    return this.prisma.job.update({
      where: { id: jobId },
      data: { notes: updatedNotes },
    });
  }

  async getJobsByTechnician(tenantId: string, technicianId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.job.findMany({
      where: {
        tenantId,
        technicianId,
        appointment: {
          scheduledAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
        photos: true,
      },
      orderBy: {
        appointment: {
          scheduledAt: 'asc',
        },
      },
    });
  }

  async uploadPhoto(
    tenantId: string,
    jobId: string,
    file: Express.Multer.File,
    type: JobPhotoType,
    caption?: string,
  ) {
    const job = await this.getJob(tenantId, jobId);

    const result = await this.storageService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      `jobs/${tenantId}`,
    );

    const photo = await this.prisma.jobPhoto.create({
      data: {
        jobId: job.id,
        url: result.url,
        key: result.key,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        type,
        caption,
      },
    });

    this.logger.log(`Photo uploaded for job ${jobId}: ${result.key}`);

    return photo;
  }

  async getJobPhotos(tenantId: string, jobId: string) {
    await this.getJob(tenantId, jobId);

    return this.prisma.jobPhoto.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deletePhoto(tenantId: string, jobId: string, photoId: string) {
    await this.getJob(tenantId, jobId);

    const photo = await this.prisma.jobPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    if (photo.jobId !== jobId) {
      throw new ForbiddenException('Access denied');
    }

    try {
      await this.storageService.delete(photo.key);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${photo.key}:`, error);
    }

    await this.prisma.jobPhoto.delete({
      where: { id: photoId },
    });

    this.logger.log(`Photo deleted: ${photoId}`);

    return { success: true };
  }

  private buildJobPayload(
    tenantId: string,
    job: {
      id: string;
      status: string;
      appointment: {
        id: string;
        customer: { id: string; name: string; phone: string };
      };
      technician?: { id: string; name: string } | null;
    },
  ): Omit<JobEventPayload, 'timestamp' | 'correlationId'> {
    return {
      tenantId,
      jobId: job.id,
      appointmentId: job.appointment.id,
      customerId: job.appointment.customer.id,
      customerName: job.appointment.customer.name,
      customerPhone: job.appointment.customer.phone,
      technicianId: job.technician?.id,
      technicianName: job.technician?.name,
      status: job.status,
    };
  }

  private async validateAppointment(tenantId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return appointment;
  }

  private async validateTechnician(tenantId: string, technicianId: string) {
    const technician = await this.prisma.user.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    if (technician.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return technician;
  }
}
