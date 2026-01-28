import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENTS,
  AppointmentEventPayload,
} from '../../config/events/events.types';
import { PrismaService } from '../../config/prisma/prisma.service';
import { WaitlistService } from './waitlist.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';

@Injectable()
export class NoshowEventHandler {
  private readonly logger = new Logger(NoshowEventHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly waitlistService: WaitlistService,
    private readonly reminderScheduler: ReminderSchedulerService,
  ) {}

  @OnEvent(EVENTS.APPOINTMENT_CANCELLED)
  async handleAppointmentCancelled(payload: AppointmentEventPayload) {
    this.logger.log(
      `Handling cancellation for appointment ${payload.appointmentId}`,
    );

    await this.reminderScheduler.cancelReminders(payload.appointmentId);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: payload.appointmentId },
      select: { serviceId: true, scheduledAt: true, duration: true },
    });

    if (appointment?.serviceId) {
      await this.waitlistService.notifyWaitlistForSlot(
        payload.tenantId,
        appointment.serviceId,
        appointment.scheduledAt,
        appointment.duration,
      );
    }
  }
}
