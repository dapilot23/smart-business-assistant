import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';

export const APPOINTMENT_REMINDER_QUEUE = 'appointment-reminders';

export interface AppointmentReminderJob {
  tenantId: string;
  appointmentId: string;
  reminderId: string;
  step: number;
  channel: 'SMS' | 'EMAIL';
}

interface ReminderStep {
  step: number;
  channel: 'SMS' | 'EMAIL';
  hoursBefore: number;
}

const REMINDER_STEPS: ReminderStep[] = [
  { step: 1, channel: 'EMAIL', hoursBefore: 48 },
  { step: 2, channel: 'SMS', hoursBefore: 24 },
  { step: 3, channel: 'SMS', hoursBefore: 2 },
];

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(APPOINTMENT_REMINDER_QUEUE) private readonly queue: Queue,
  ) {}

  async scheduleReminders(appointmentId: string, tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (settings && !settings.appointmentReminders) {
      this.logger.log(`Appointment reminders disabled for tenant ${tenantId}`);
      return;
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true, service: true },
    });

    if (!appointment) {
      this.logger.warn(`Appointment ${appointmentId} not found`);
      return;
    }

    const now = new Date();
    const reminders = await this.createReminderRecords(
      tenantId,
      appointmentId,
      appointment.scheduledAt,
      now,
    );

    await this.enqueueReminderJobs(tenantId, appointmentId, reminders, now);

    this.logger.log(
      `Scheduled ${reminders.length} reminders for appointment ${appointmentId}`,
    );
  }

  async cancelReminders(appointmentId: string) {
    const pending = await this.prisma.appointmentReminder.findMany({
      where: { appointmentId, status: 'PENDING' },
    });

    if (pending.length === 0) return;

    await this.prisma.appointmentReminder.updateMany({
      where: { appointmentId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    for (const reminder of pending) {
      try {
        const job = await this.queue.getJob(`appt-reminder-${reminder.id}`);
        if (job) await job.remove();
      } catch (error) {
        this.logger.warn(
          `Failed to remove job for reminder ${reminder.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Cancelled ${pending.length} reminders for appointment ${appointmentId}`,
    );
  }

  getReminderMessage(
    step: number,
    customerName: string,
    serviceName: string,
    dateStr: string,
    timeStr: string,
    manageToken?: string | null,
  ): { message: string; subject: string } {
    const manageUrl = manageToken
      ? `\nManage your booking: ${process.env.FRONTEND_URL || 'https://app.example.com'}/booking/manage/${manageToken}`
      : '';

    switch (step) {
      case 1:
        return {
          message:
            `Hi ${customerName}, you have a ${serviceName} appointment on ${dateStr} at ${timeStr}.` +
            manageUrl,
          subject: `Upcoming Appointment - ${serviceName} on ${dateStr}`,
        };
      case 2:
        return {
          message:
            `Reminder: ${customerName}, your ${serviceName} is tomorrow at ${timeStr}. ` +
            `Reply C to confirm or R to reschedule.`,
          subject: '',
        };
      case 3:
        return {
          message: `Hi ${customerName}, your technician is on the way for your ${serviceName} at ${timeStr}. See you soon!`,
          subject: '',
        };
      default:
        return { message: '', subject: '' };
    }
  }

  private async createReminderRecords(
    tenantId: string,
    appointmentId: string,
    scheduledAt: Date,
    now: Date,
  ) {
    const records = REMINDER_STEPS.map((step) => {
        const reminderTime = new Date(
          scheduledAt.getTime() - step.hoursBefore * 60 * 60 * 1000,
        );
        return {
          tenantId,
          appointmentId,
          step: step.step,
          channel: step.channel,
          scheduledAt: reminderTime,
          status: 'PENDING',
        };
      })
      .filter((r) => r.scheduledAt.getTime() > now.getTime());

    const created = await Promise.all(
      records.map((data) =>
        this.prisma.appointmentReminder.create({ data }),
      ),
    );

    return created;
  }

  private async enqueueReminderJobs(
    tenantId: string,
    appointmentId: string,
    reminders: { id: string; step: number; channel: string; scheduledAt: Date }[],
    now: Date,
  ) {
    for (const reminder of reminders) {
      const delay = reminder.scheduledAt.getTime() - now.getTime();

      const jobData: AppointmentReminderJob = {
        tenantId,
        appointmentId,
        reminderId: reminder.id,
        step: reminder.step,
        channel: reminder.channel as 'SMS' | 'EMAIL',
      };

      await this.queue.add('process-appointment-reminder', jobData, {
        delay,
        jobId: `appt-reminder-${reminder.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      });
    }
  }
}
