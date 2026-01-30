import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

interface TechnicianSummary {
  technicianId: string;
  technicianName: string;
  jobsCompleted: number;
  scheduledDistanceKm: number;
  optimizedDistanceKm: number;
  routeEfficiencyPercent: number | null;
}
export interface DispatchSummary {
  date: string;
  totalDistanceKm: number;
  totalMiles: number;
  averageRouteEfficiency: number | null;
  technicians: TechnicianSummary[];
}
@Injectable()
export class DispatchSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getEndOfDaySummary(tenantId: string, date: Date): Promise<DispatchSummary> {
    const { startOfDay, endOfDay } = this.getDayRange(date);
    const technicians = await this.getTechnicians(tenantId);
    const summaries = await Promise.all(
      technicians.map((tech) => this.buildTechnicianSummary(tenantId, tech.id, tech.name, startOfDay, endOfDay)),
    );

    const totalDistanceKm = summaries.reduce((sum, s) => sum + s.optimizedDistanceKm, 0);
    const efficiencies = summaries
      .map((s) => s.routeEfficiencyPercent)
      .filter((value): value is number => value !== null);
    const averageRouteEfficiency =
      efficiencies.length > 0
        ? Math.round(efficiencies.reduce((sum, val) => sum + val, 0) / efficiencies.length)
        : null;

    return {
      date: startOfDay.toISOString().slice(0, 10),
      totalDistanceKm,
      totalMiles: this.kmToMiles(totalDistanceKm),
      averageRouteEfficiency,
      technicians: summaries,
    };
  }

  private getDayRange(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
  }

  private async getTechnicians(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
      select: { id: true, name: true },
    });
  }

  private async buildTechnicianSummary(
    tenantId: string,
    technicianId: string,
    technicianName: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<TechnicianSummary> {
    const [jobsCompleted, optimizedDistanceKm, scheduledDistanceKm] = await Promise.all([
      this.getJobsCompleted(tenantId, technicianId, startOfDay, endOfDay),
      this.getOptimizedDistance(tenantId, technicianId, startOfDay),
      this.getScheduledDistance(tenantId, technicianId, startOfDay, endOfDay),
    ]);

    return {
      technicianId,
      technicianName,
      jobsCompleted,
      scheduledDistanceKm,
      optimizedDistanceKm,
      routeEfficiencyPercent: this.calculateEfficiency(scheduledDistanceKm, optimizedDistanceKm),
    };
  }

  private async getJobsCompleted(
    tenantId: string,
    technicianId: string,
    startOfDay: Date,
    endOfDay: Date,
  ) {
    return this.prisma.job.count({
      where: {
        tenantId,
        technicianId,
        status: 'COMPLETED',
        appointment: {
          scheduledAt: { gte: startOfDay, lte: endOfDay },
        },
      },
    });
  }

  private async getOptimizedDistance(
    tenantId: string,
    technicianId: string,
    date: Date,
  ) {
    const route = await this.prisma.optimizedRoute.findUnique({
      where: {
        tenantId_technicianId_date: {
          tenantId,
          technicianId,
          date,
        },
      },
    });

    if (!route?.stops) return 0;
    if (route.totalDistance !== null && route.totalDistance !== undefined) {
      return route.totalDistance;
    }

    return this.calculateDistanceFromStops(route.stops as any[]);
  }

  private async getScheduledDistance(
    tenantId: string,
    technicianId: string,
    startOfDay: Date,
    endOfDay: Date,
  ) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        assignedTo: technicianId,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
      },
      include: { customer: { include: { location: true } } },
      orderBy: { scheduledAt: 'asc' },
    });

    const coords = appointments
      .map((appt) => appt.customer?.location)
      .filter((loc) => loc?.latitude && loc?.longitude)
      .map((loc) => ({ lat: loc!.latitude!, lng: loc!.longitude! }));

    return this.calculateDistanceFromCoords(coords);
  }

  private calculateEfficiency(originalKm: number, optimizedKm: number): number | null {
    if (!originalKm || !optimizedKm) return null;
    if (optimizedKm >= originalKm) return 0;
    return Math.round(((originalKm - optimizedKm) / originalKm) * 100);
  }

  private calculateDistanceFromStops(stops: Array<{ location?: { lat: number; lng: number } }>) {
    const coords = stops
      .map((stop) => stop.location)
      .filter((loc): loc is { lat: number; lng: number } => !!loc?.lat && !!loc?.lng);
    return this.calculateDistanceFromCoords(coords);
  }

  private calculateDistanceFromCoords(coords: Array<{ lat: number; lng: number }>) {
    if (coords.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      total += this.haversineDistance(coords[i - 1], coords[i]);
    }
    return total;
  }

  private haversineDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number },
  ) {
    const R = 6371;
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coord1.lat)) *
        Math.cos(this.toRad(coord2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number) {
    return deg * (Math.PI / 180);
  }

  private kmToMiles(km: number) {
    return Math.round(km * 0.621371 * 10) / 10;
  }
}
