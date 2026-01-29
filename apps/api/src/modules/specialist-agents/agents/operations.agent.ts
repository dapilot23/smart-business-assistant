import { AgentType, InsightPriority, Appointment } from '@prisma/client';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { AiEngineService } from '../../ai-engine/ai-engine.service';
import { BaseAgent, AgentInsightInput, AgentRunContext } from './base-agent';

interface AppointmentWithDetails extends Appointment {
  customer: {
    name: string;
    phone: string;
    noShowCount: number;
    churnRisk: number;
  };
  service: { name: string; durationMinutes: number } | null;
  assignedUser: { name: string } | null;
}

export class OperationsAgent extends BaseAgent {
  constructor(prisma: PrismaService, aiEngine: AiEngineService) {
    super(prisma, aiEngine, AgentType.OPERATIONS);
  }

  getName(): string {
    return 'Operations Agent';
  }

  getDescription(): string {
    return 'Optimizes scheduling and predicts no-shows';
  }

  protected async fetchEntities(tenantId: string): Promise<AppointmentWithDetails[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: tomorrow, lte: nextWeek },
      },
      include: {
        customer: {
          select: { name: true, phone: true, noShowCount: true, churnRisk: true },
        },
        service: {
          select: { name: true, durationMinutes: true },
        },
        assignedUser: {
          select: { name: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });
  }

  protected async analyzeEntity(
    entity: unknown,
    context: AgentRunContext,
  ): Promise<AgentInsightInput[]> {
    const appointment = entity as AppointmentWithDetails;
    const insights: AgentInsightInput[] = [];

    const noShowRisk = this.calculateNoShowRisk(appointment);
    const hoursUntilAppointment = Math.floor(
      (appointment.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60),
    );

    // High no-show risk prediction
    if (noShowRisk >= 0.4) {
      const confidence = noShowRisk;
      const impact = 0.7;
      const priority =
        noShowRisk >= 0.6
          ? InsightPriority.HIGH
          : InsightPriority.MEDIUM;

      insights.push({
        entityType: 'appointment',
        entityId: appointment.id,
        insightType: 'no_show_risk',
        title: `High no-show risk: ${appointment.customer.name}`,
        description:
          `Appointment on ${this.formatDate(appointment.scheduledAt)} ` +
          `has a ${Math.round(noShowRisk * 100)}% no-show risk. ` +
          `Customer has ${appointment.customer.noShowCount} previous no-shows.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority,
        recommendedAction: 'Send extra confirmation reminder',
        actionParams: {
          appointmentId: appointment.id,
          customerId: appointment.customerId,
          phone: appointment.customer.phone,
        },
        actionLabel: 'Send Reminder',
        expiresAt: appointment.scheduledAt,
        aiReasoning:
          'Customers with prior no-shows are more likely to miss again. ' +
          'An extra reminder or confirmation call can reduce this risk.',
      });
    }

    // Unconfirmed appointment within 24 hours
    if (
      appointment.status === 'SCHEDULED' &&
      !appointment.confirmedAt &&
      hoursUntilAppointment <= 24
    ) {
      const confidence = 0.9;
      const impact = 0.6;
      insights.push({
        entityType: 'appointment',
        entityId: appointment.id,
        insightType: 'unconfirmed_soon',
        title: `Unconfirmed: ${appointment.customer.name} tomorrow`,
        description:
          `Appointment for ${appointment.service?.name ?? 'service'} ` +
          `at ${this.formatTime(appointment.scheduledAt)} is not yet confirmed. ` +
          `Consider calling to confirm.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: InsightPriority.HIGH,
        recommendedAction: 'Call to confirm appointment',
        actionParams: {
          appointmentId: appointment.id,
          phone: appointment.customer.phone,
        },
        actionLabel: 'Call to Confirm',
        expiresAt: appointment.scheduledAt,
        aiReasoning:
          'Unconfirmed appointments have higher no-show rates. ' +
          'A quick confirmation call improves attendance.',
      });
    }

    // Unassigned appointment
    if (!appointment.assignedTo && hoursUntilAppointment <= 48) {
      const confidence = 1.0;
      const impact = 0.8;
      insights.push({
        entityType: 'appointment',
        entityId: appointment.id,
        insightType: 'unassigned_appointment',
        title: `Unassigned: ${appointment.customer.name}`,
        description:
          `Appointment on ${this.formatDate(appointment.scheduledAt)} ` +
          `is not assigned to a technician. Assign someone before the appointment.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: InsightPriority.URGENT,
        recommendedAction: 'Assign a technician',
        actionParams: {
          appointmentId: appointment.id,
          scheduledAt: appointment.scheduledAt.toISOString(),
        },
        actionLabel: 'Assign Tech',
        expiresAt: appointment.scheduledAt,
        aiReasoning:
          'Unassigned appointments can lead to confusion and missed jobs.',
      });
    }

    return insights;
  }

  private calculateNoShowRisk(appointment: AppointmentWithDetails): number {
    let risk = 0.1; // Base risk

    // Factor in prior no-shows (major factor)
    if (appointment.customer.noShowCount >= 3) {
      risk += 0.4;
    } else if (appointment.customer.noShowCount >= 2) {
      risk += 0.25;
    } else if (appointment.customer.noShowCount >= 1) {
      risk += 0.15;
    }

    // Factor in churn risk
    risk += appointment.customer.churnRisk * 0.2;

    // Unconfirmed appointments are riskier
    if (!appointment.confirmedAt) {
      risk += 0.1;
    }

    return Math.min(risk, 1.0);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
