import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SmsService } from './sms.service';

@Injectable()
export class SmsSchedulerService {
  private readonly logger = new Logger(SmsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  // Run every hour to check for appointments 24 hours from now
  @Cron(CronExpression.EVERY_HOUR)
  async send24HourReminders() {
    if (!this.smsService.isServiceConfigured()) {
      this.logger.debug('SMS service not configured, skipping 24-hour reminders');
      return;
    }

    this.logger.log('Running 24-hour appointment reminder check');

    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyFourHoursPlusBuffer = new Date(
      now.getTime() + 25 * 60 * 60 * 1000,
    );

    try {
      const appointments = await this.findUpcomingAppointments(
        twentyFourHoursFromNow,
        twentyFourHoursPlusBuffer,
      );

      this.logger.log(
        `Found ${appointments.length} appointments for 24-hour reminders`,
      );

      await this.sendReminders(appointments, '24-hour');
    } catch (error) {
      this.logger.error('Error sending 24-hour reminders:', error);
    }
  }

  // Run every 15 minutes to check for appointments 1 hour from now
  @Cron(CronExpression.EVERY_30_MINUTES)
  async send1HourReminders() {
    if (!this.smsService.isServiceConfigured()) {
      this.logger.debug('SMS service not configured, skipping 1-hour reminders');
      return;
    }

    this.logger.log('Running 1-hour appointment reminder check');

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourPlusBuffer = new Date(now.getTime() + 90 * 60 * 1000);

    try {
      const appointments = await this.findUpcomingAppointments(
        oneHourFromNow,
        oneHourPlusBuffer,
      );

      this.logger.log(
        `Found ${appointments.length} appointments for 1-hour reminders`,
      );

      await this.sendReminders(appointments, '1-hour');
    } catch (error) {
      this.logger.error('Error sending 1-hour reminders:', error);
    }
  }

  private async findUpcomingAppointments(startTime: Date, endTime: Date) {
    return this.prisma.appointment.findMany({
      where: {
        scheduledAt: {
          gte: startTime,
          lte: endTime,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
      },
      include: {
        customer: true,
        service: true,
      },
    });
  }

  private async sendReminders(appointments: any[], reminderType: string) {
    let sent = 0;
    let failed = 0;

    for (const appointment of appointments) {
      if (!appointment.customer?.phone) {
        this.logger.warn(
          `Skipping appointment ${appointment.id}: customer has no phone number`,
        );
        continue;
      }

      try {
        await this.smsService.sendAppointmentReminder(
          appointment,
          appointment.customer,
        );
        sent++;
        this.logger.log(
          `Sent ${reminderType} reminder for appointment ${appointment.id}`,
        );
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to send ${reminderType} reminder for appointment ${appointment.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `${reminderType} reminders complete: ${sent} sent, ${failed} failed`,
    );
  }
}
