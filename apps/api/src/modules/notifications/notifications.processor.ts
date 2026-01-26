import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATION_QUEUE, NotificationJob } from './notifications.service';
import { SmsService } from '../sms/sms.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly smsService: SmsService) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    const { type, to, message, correlationId } = job.data;

    this.logger.log(
      `Processing ${type} notification to ${to} [${correlationId}]`,
    );

    try {
      switch (type) {
        case 'sms':
          await this.processSms(job.data);
          break;
        case 'email':
          await this.processEmail(job.data);
          break;
        default:
          this.logger.warn(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process ${type} notification: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  private async processSms(data: NotificationJob): Promise<void> {
    const { to, message } = data;

    if (!this.smsService.isServiceConfigured()) {
      this.logger.warn('SMS service not configured, skipping notification');
      return;
    }

    await this.smsService.sendSms(to, message);
    this.logger.log(`SMS sent to ${to}`);
  }

  private async processEmail(data: NotificationJob): Promise<void> {
    // Email processing would go here
    // For now, just log since Resend integration isn't complete
    this.logger.log(`Email would be sent to ${data.to}: ${data.subject}`);
  }
}
