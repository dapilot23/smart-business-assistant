import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  APPOINTMENT_REMINDER_QUEUE,
  AppointmentReminderJob,
  ReminderSchedulerService,
} from './reminder-scheduler.service';

@Processor(APPOINTMENT_REMINDER_QUEUE)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly reminderScheduler: ReminderSchedulerService,
  ) {
    super();
  }

  async process(job: Job<AppointmentReminderJob>): Promise<void> {
    const { reminderId, tenantId } = job.data;

    const reminder = await this.prisma.appointmentReminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder || reminder.status !== 'PENDING') {
      this.logger.log(`Reminder ${reminderId} skipped (not pending)`);
      return;
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: reminder.appointmentId },
      include: { customer: true, service: true, tenant: true },
    });

    if (!appointment || ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      this.logger.log(`Appointment resolved, skipping reminder`);
      await this.markCancelled(reminderId);
      return;
    }

    // Step 3 (2h) only fires if appointment is CONFIRMED
    if (reminder.step === 3 && appointment.status !== 'CONFIRMED') {
      this.logger.log(`Appointment not confirmed, skipping 2h reminder`);
      await this.markCancelled(reminderId);
      return;
    }

    const dateStr = appointment.scheduledAt.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const timeStr = appointment.scheduledAt.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    });

    const { message, subject } = this.reminderScheduler.getReminderMessage(
      reminder.step,
      appointment.customer.name,
      appointment.service?.name || 'your appointment',
      dateStr,
      timeStr,
      appointment.manageToken,
    );

    await this.sendReminder(
      reminder.channel,
      appointment,
      message,
      subject,
      tenantId,
    );

    await this.prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    this.logger.log(
      `Reminder step ${reminder.step} sent for appointment ${appointment.id}`,
    );
  }

  private async sendReminder(
    channel: string,
    appointment: any,
    message: string,
    subject: string,
    tenantId: string,
  ) {
    if (channel === 'SMS' && appointment.customer.phone) {
      await this.notifications.queueSms(
        appointment.customer.phone,
        message,
        tenantId,
      );
    }
    if (channel === 'EMAIL' && appointment.customer.email) {
      await this.notifications.queueEmail(
        appointment.customer.email,
        subject || 'Appointment Reminder',
        'appointment-reminder',
        {
          customerName: appointment.customer.name,
          serviceName: appointment.service?.name || 'Appointment',
          scheduledAt: appointment.scheduledAt,
          message,
        },
        tenantId,
      );
    }
  }

  private async markCancelled(reminderId: string) {
    await this.prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: { status: 'CANCELLED' },
    });
  }
}
