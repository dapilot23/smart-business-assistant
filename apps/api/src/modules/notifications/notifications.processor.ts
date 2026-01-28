import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATION_QUEUE, NotificationJob } from './notifications.service';
import { SmsService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {
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
    if (!this.emailService.isServiceConfigured()) {
      this.logger.warn('Email service not configured, skipping notification');
      return;
    }

    const templateData = (data.data || {}) as Record<string, any>;

    switch (data.template) {
      case 'booking-confirmation':
        await this.emailService.sendBookingConfirmation({
          customerName: templateData.customerName,
          customerEmail: data.to,
          serviceName: templateData.serviceName,
          scheduledAt: new Date(templateData.scheduledAt),
          duration: templateData.duration || 60,
          businessName: templateData.businessName || '',
          businessEmail: templateData.businessEmail || '',
          businessPhone: templateData.businessPhone,
          confirmationCode: templateData.confirmationCode,
          cancelUrl: templateData.cancelUrl,
          rescheduleUrl: templateData.rescheduleUrl,
        });
        break;

      case 'appointment-cancellation':
        await this.emailService.sendBookingCancellation({
          customerName: templateData.customerName,
          customerEmail: data.to,
          serviceName: templateData.serviceName,
          scheduledAt: new Date(templateData.scheduledAt),
          duration: templateData.duration || 60,
          businessName: templateData.businessName || '',
          businessEmail: templateData.businessEmail || '',
          businessPhone: templateData.businessPhone,
        });
        break;

      default:
        this.logger.warn(`Unknown email template: ${data.template}`);
    }

    this.logger.log(`Email sent to ${data.to} (template: ${data.template})`);
  }
}
