import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { TechnicianSkillsService } from '../team/technician-skills.service';
import { RouteOptimizationService } from './route-optimization.service';
import { SkillLevel, UserRole, UserStatus } from '@prisma/client';

export interface TechnicianScore {
  userId: string;
  userName: string;
  skillLevel: SkillLevel | null;
  skillScore: number;
  proximityScore: number;
  workloadScore: number;
  totalScore: number;
  currentLocation?: { lat: number; lng: number };
  jobsToday: number;
}

export interface ReassignmentSuggestion {
  suggestedTechnician: TechnicianScore;
  affectedAppointments: Array<{ id: string; scheduledAt: Date; customerName: string }>;
  reason: string;
}

export interface GapFillSuggestion {
  appointmentId: string;
  customerName: string;
  serviceName: string;
  duration: number;
  distance: number;
  fitsInGap: boolean;
  skillLevel: SkillLevel | null;
}

interface FindBestTechnicianOptions {
  tenantId: string;
  serviceId: string;
  date: Date;
  location?: { lat: number; lng: number };
}

@Injectable()
export class SmartDispatchService {
  private readonly logger = new Logger(SmartDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skillsService: TechnicianSkillsService,
    private readonly routeService: RouteOptimizationService,
  ) {}

  async findBestTechnician(opts: FindBestTechnicianOptions): Promise<TechnicianScore[]> {
    const { tenantId, serviceId, date, location } = opts;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get technicians with skills for this service
    const skilledTechs = await this.skillsService.getTechniciansForService(serviceId, tenantId);
    const skillMap = new Map(skilledTechs.map((t) => [t.userId, t.level]));

    // Get all active technicians who are available on this day
    const availableTechs = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: UserRole.TECHNICIAN,
        status: UserStatus.ACTIVE,
        timeOff: {
          none: {
            startDate: { lte: endOfDay },
            endDate: { gte: startOfDay },
          },
        },
      },
      select: { id: true, name: true },
    });

    const scores: TechnicianScore[] = [];

    for (const tech of availableTechs) {
      const score = await this.calculateTechnicianScore(
        tech.id,
        tech.name,
        serviceId,
        tenantId,
        date,
        location,
        skillMap.get(tech.id) || null,
      );
      scores.push(score);
    }

    // Sort by total score (highest first)
    scores.sort((a, b) => b.totalScore - a.totalScore);

    return scores;
  }

  private async calculateTechnicianScore(
    userId: string,
    userName: string,
    serviceId: string,
    tenantId: string,
    date: Date,
    location: { lat: number; lng: number } | undefined,
    skillLevel: SkillLevel | null,
  ): Promise<TechnicianScore> {
    // Skill score: EXPERT=100, INTERMEDIATE=60, BASIC=30, none=0
    const skillScore = this.getSkillScore(skillLevel);

    // Proximity score: 0-50 based on distance
    let proximityScore = 0;
    let currentLocation: { lat: number; lng: number } | undefined;

    if (location) {
      const techLocation = await this.routeService.getTechnicianLocation(userId);
      if (techLocation) {
        currentLocation = { lat: techLocation.latitude, lng: techLocation.longitude };
        const distance = this.haversineDistance(location, currentLocation);
        proximityScore = this.calculateProximityScore(distance);
      }
    }

    // Workload score: 0-50 based on jobs scheduled today
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const jobsToday = await this.prisma.appointment.count({
      where: {
        tenantId,
        assignedTo: userId,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    });

    const workloadScore = this.calculateWorkloadScore(jobsToday);
    const totalScore = skillScore + proximityScore + workloadScore;

    return {
      userId,
      userName,
      skillLevel,
      skillScore,
      proximityScore,
      workloadScore,
      totalScore,
      currentLocation,
      jobsToday,
    };
  }

  private getSkillScore(level: SkillLevel | null): number {
    switch (level) {
      case SkillLevel.EXPERT:
        return 100;
      case SkillLevel.INTERMEDIATE:
        return 60;
      case SkillLevel.BASIC:
        return 30;
      default:
        return 0;
    }
  }

  private calculateProximityScore(distanceKm: number): number {
    // Max score at 0km, decreasing to 0 at 50km
    if (distanceKm >= 50) return 0;
    return Math.round(50 * (1 - distanceKm / 50));
  }

  private calculateWorkloadScore(jobsToday: number): number {
    // Max score with 0 jobs, decreasing as workload increases
    if (jobsToday >= 8) return 0;
    return Math.round(50 * (1 - jobsToday / 8));
  }

  async suggestReassignment(jobId: string, tenantId: string): Promise<ReassignmentSuggestion | null> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        appointment: {
          include: {
            customer: { include: { location: true } },
          },
        },
      },
    });

    if (!job || job.tenantId !== tenantId || !job.technicianId) {
      return null;
    }

    // Find appointments that would be affected
    const endOfDay = new Date(job.appointment.scheduledAt);
    endOfDay.setHours(23, 59, 59, 999);

    const affectedAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        assignedTo: job.technicianId,
        scheduledAt: { gt: job.appointment.scheduledAt, lte: endOfDay },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: { customer: true },
      orderBy: { scheduledAt: 'asc' },
    });

    if (affectedAppointments.length === 0) {
      return null;
    }

    // Find best alternative technician
    const location = job.appointment.customer?.location
      ? { lat: job.appointment.customer.location.latitude!, lng: job.appointment.customer.location.longitude! }
      : undefined;

    const alternatives = await this.findBestTechnician({
      tenantId,
      serviceId: job.appointment.serviceId!,
      date: job.appointment.scheduledAt,
      location,
    });

    // Filter out the current technician
    const validAlternatives = alternatives.filter((t) => t.userId !== job.technicianId);

    if (validAlternatives.length === 0) {
      return null;
    }

    const suggestedTechnician = validAlternatives[0];

    return {
      suggestedTechnician,
      affectedAppointments: affectedAppointments.map((a) => ({
        id: a.id,
        scheduledAt: a.scheduledAt,
        customerName: a.customer.name,
      })),
      reason: `Job running long. ${suggestedTechnician.userName} is available with ${suggestedTechnician.skillLevel || 'unrated'} skill level.`,
    };
  }

  async fillCancellationGap(
    technicianId: string,
    date: Date,
    startTime: Date,
    endTime: Date,
    tenantId: string,
  ): Promise<GapFillSuggestion[]> {
    const gapMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    // Get technician's current location
    const techLocation = await this.routeService.getTechnicianLocation(technicianId);

    // Find unassigned appointments that could fill the gap
    const pendingAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        assignedTo: null,
        status: 'SCHEDULED',
      },
      include: {
        customer: { include: { location: true } },
        service: true,
      },
      take: 20,
    });

    const suggestions: GapFillSuggestion[] = [];

    for (const appt of pendingAppointments) {
      let distance = 0;

      if (techLocation && appt.customer?.location?.latitude && appt.customer?.location?.longitude) {
        distance = this.haversineDistance(
          { lat: techLocation.latitude, lng: techLocation.longitude },
          { lat: appt.customer.location.latitude, lng: appt.customer.location.longitude },
        );
      }

      const skillLevel = appt.serviceId
        ? await this.skillsService.getSkillLevel(technicianId, appt.serviceId, tenantId)
        : null;

      const fitsInGap = appt.duration <= gapMinutes;

      suggestions.push({
        appointmentId: appt.id,
        customerName: appt.customer?.name || 'Unknown',
        serviceName: appt.service?.name || 'Unknown',
        duration: appt.duration,
        distance,
        fitsInGap,
        skillLevel,
      });
    }

    // Sort by: fits in gap, then by distance, then by skill
    suggestions.sort((a, b) => {
      if (a.fitsInGap !== b.fitsInGap) return a.fitsInGap ? -1 : 1;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return this.getSkillScore(b.skillLevel) - this.getSkillScore(a.skillLevel);
    });

    return suggestions;
  }

  private haversineDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number },
  ): number {
    const R = 6371; // Earth's radius in km
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

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
