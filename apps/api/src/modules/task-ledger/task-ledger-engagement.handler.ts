import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EVENTS, TaskActionEventPayload } from '../../config/events/events.types';
import { SmsService } from '../sms/sms.service';
import { ReviewRequestsService } from '../review-requests/review-requests.service';
import {
  getAppointmentIds,
  getJobIds,
  getPayloadNumber,
  getPayloadValue,
} from './task-ledger-action.utils';

const DEFAULT_APPOINTMENT_LIMIT = 10;
const DEFAULT_REVIEW_LIMIT = 5;
const REVIEW_LOOKBACK_DAYS = 7;

type AppointmentWithCustomer = {
  id: string;
  tenantId: string;
  scheduledAt: Date;
  duration: number;
  customer: { name: string; phone: string };
  service?: { name: string } | null;
};

@Injectable()
export class TaskLedgerEngagementHandler {
  private readonly logger = new Logger(TaskLedgerEngagementHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly reviewRequests: ReviewRequestsService,
  ) {}

  @OnEvent(EVENTS.APPOINTMENT_CONFIRMATION_REQUESTED)
  async handleAppointmentConfirmation(payload: TaskActionEventPayload) {
    const appointmentIds = getAppointmentIds(payload);
    const limit = getPayloadNumber(payload, 'count', DEFAULT_APPOINTMENT_LIMIT);
    const appointments = appointmentIds.length > 0
      ? await this.fetchAppointmentsByIds(payload.tenantId, appointmentIds)
      : await this.fetchUnconfirmedAppointments(payload.tenantId, limit);
    await this.confirmAppointments(appointments);
  }

  @OnEvent(EVENTS.REVIEW_REQUEST_REQUESTED)
  async handleReviewRequest(payload: TaskActionEventPayload) {
    const jobIds = getJobIds(payload);
    if (jobIds.length > 0) {
      await this.processReviewJobs(payload.tenantId, jobIds);
      return;
    }
    const scope = getPayloadValue(payload, 'scope');
    if (scope === 'recent_customers') {
      const limit = getPayloadNumber(payload, 'limit', DEFAULT_REVIEW_LIMIT);
      await this.processRecentCompletedJobs(payload.tenantId, limit);
      return;
    }
    this.logger.warn('Review request action missing job scope or jobId');
  }

  private async fetchAppointmentsByIds(tenantId: string, ids: string[]) {
    return this.prisma.appointment.findMany({
      where: { tenantId, id: { in: ids } },
      include: { customer: true, service: true },
    });
  }

  private async fetchUnconfirmedAppointments(tenantId: string, limit: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);

    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: 'SCHEDULED',
        confirmedAt: null,
        scheduledAt: { gte: today, lt: tomorrow },
      },
      include: { customer: true, service: true },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
  }

  private async confirmAppointments(appointments: AppointmentWithCustomer[]) {
    if (appointments.length === 0) return;
    for (const appointment of appointments) {
      await this.confirmAppointment(appointment);
    }
  }

  private async confirmAppointment(appointment: AppointmentWithCustomer) {
    if (!appointment.customer?.phone) {
      this.logger.warn(`Appointment ${appointment.id} missing customer phone`);
      return;
    }
    await this.sms.sendAppointmentConfirmation(appointment, appointment.customer);
    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
  }

  private async processReviewJobs(tenantId: string, jobIds: string[]) {
    for (const jobId of jobIds) {
      await this.createAndSendReviewRequest(tenantId, jobId);
    }
  }

  private async processRecentCompletedJobs(tenantId: string, limit: number) {
    const cutoff = new Date(Date.now() - REVIEW_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const jobs = await this.prisma.job.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        completedAt: { gte: cutoff },
        reviewRequest: { is: null },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });
    for (const job of jobs) {
      await this.createAndSendReviewRequest(tenantId, job.id);
    }
  }

  private async createAndSendReviewRequest(tenantId: string, jobId: string) {
    try {
      const request = await this.reviewRequests.createReviewRequest(tenantId, jobId);
      await this.reviewRequests.sendReviewRequest(tenantId, request.id);
    } catch (error) {
      this.logger.warn(`Failed to send review request for job ${jobId}: ${error}`);
    }
  }
}
