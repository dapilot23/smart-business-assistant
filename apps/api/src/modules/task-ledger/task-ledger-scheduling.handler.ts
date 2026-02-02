import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EVENTS, TaskActionEventPayload } from '../../config/events/events.types';
import { SmsService } from '../sms/sms.service';
import { NoshowPreventionService } from '../noshow-prevention/noshow-prevention.service';
import {
  getAppointmentIds,
  getPayloadNumber,
  getPayloadValue,
} from './task-ledger-action.utils';

const DEFAULT_REMINDER_LIMIT = 10;
const HOURS_24 = 24 * 60 * 60 * 1000;

type AppointmentWithCustomer = {
  id: string;
  tenantId: string;
  scheduledAt: Date;
  duration: number;
  customer: { name: string; phone: string };
  service?: { name: string } | null;
};

@Injectable()
export class TaskLedgerSchedulingHandler {
  private readonly logger = new Logger(TaskLedgerSchedulingHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly noshow: NoshowPreventionService,
  ) {}

  @OnEvent(EVENTS.APPOINTMENT_REMINDER_REQUESTED)
  async handleAppointmentReminder(payload: TaskActionEventPayload) {
    const appointmentIds = getAppointmentIds(payload);
    const limit = getPayloadNumber(payload, 'count', DEFAULT_REMINDER_LIMIT);
    const appointments = appointmentIds.length > 0
      ? await this.fetchAppointmentsByIds(payload.tenantId, appointmentIds)
      : await this.fetchAppointmentsByWindow(payload.tenantId, payload, limit);
    await this.sendReminders(appointments);
  }

  @OnEvent(EVENTS.NO_SHOW_REQUESTED)
  async handleNoShow(payload: TaskActionEventPayload) {
    const appointmentIds = getAppointmentIds(payload);
    if (appointmentIds.length === 0) {
      this.logger.warn('No-show requested without appointment scope or appointmentId');
      return;
    }
    for (const appointmentId of appointmentIds) {
      try {
        await this.noshow.markNoShow(appointmentId, payload.tenantId);
      } catch (error) {
        this.logger.warn(`Failed to mark no-show for ${appointmentId}: ${error}`);
      }
    }
  }

  private async fetchAppointmentsByIds(tenantId: string, ids: string[]) {
    return this.prisma.appointment.findMany({
      where: { tenantId, id: { in: ids } },
      include: { customer: true, service: true },
    });
  }

  private async fetchAppointmentsByWindow(
    tenantId: string,
    payload: TaskActionEventPayload,
    limit: number,
  ) {
    const { start, end } = this.resolveReminderWindow(payload);

    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: start, lt: end },
      },
      include: { customer: true, service: true },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
  }

  private resolveReminderWindow(payload: TaskActionEventPayload) {
    const scope = getPayloadValue(payload, 'scope');
    const dateOverride = getPayloadValue(payload, 'date');
    const now = new Date();

    if (typeof dateOverride === 'string') {
      const parsed = new Date(dateOverride);
      if (!Number.isNaN(parsed.getTime())) {
        const start = new Date(parsed);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
      }
    }

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    if (scope === 'tomorrow') {
      const start = new Date(today);
      start.setDate(start.getDate() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }

    if (scope === 'next_48_hours') {
      return { start: now, end: new Date(now.getTime() + HOURS_24 * 2) };
    }

    if (scope === 'next_24_hours' || scope === 'upcoming') {
      return { start: now, end: new Date(now.getTime() + HOURS_24) };
    }

    return { start: today, end: new Date(today.getTime() + HOURS_24) };
  }

  private async sendReminders(appointments: AppointmentWithCustomer[]) {
    if (appointments.length === 0) return;
    for (const appointment of appointments) {
      if (!appointment.customer?.phone) {
        this.logger.warn(`Appointment ${appointment.id} missing customer phone`);
        continue;
      }
      await this.sms.sendAppointmentReminder(appointment, appointment.customer);
    }
  }
}
