import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATION_QUEUE, NotificationJob } from './notifications.service';
import { SmsService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../config/prisma/prisma.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    const { type, to, message, correlationId, tenantId } = job.data;

    const run = async () => {
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
    };

    if (tenantId) {
      await this.prisma.withTenantContext(tenantId, run);
      return;
    }

    await run();
  }

  private async processSms(data: NotificationJob): Promise<void> {
    const { to, message, tenantId } = data;

    if (!this.smsService.isServiceConfigured()) {
      this.logger.warn('SMS service not configured, skipping notification');
      return;
    }

    const result = await this.smsService.sendSms(to, message, { tenantId });
    if (result?.skipped) {
      this.logger.warn(`SMS skipped for opted-out recipient: ${to}`);
      return;
    }
    this.logger.log(`SMS sent to ${to}`);
  }

  private async processEmail(data: NotificationJob): Promise<void> {
    if (!this.emailService.isServiceConfigured()) {
      this.logger.warn('Email service not configured, skipping notification');
      return;
    }

    const templateData = (data.data || {}) as Record<string, any>;
    let sent = true;

    switch (data.template) {
      case 'booking-confirmation':
        sent = await this.emailService.sendBookingConfirmation({
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

      case 'appointment-reminder': {
        const subject = data.subject || 'Appointment Reminder';
        const message =
          templateData.message ||
          this.buildAppointmentReminderMessage(templateData);

        sent = await this.emailService.sendCustomEmail({
          to: data.to,
          subject,
          html: this.renderMessageHtml(subject, message),
          tenantId: data.tenantId,
        });
        break;
      }

      case 'appointment-cancellation':
        sent = await this.emailService.sendBookingCancellation({
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

      case 'payment-reminder': {
        const subject =
          data.subject ||
          `Payment Reminder${templateData.invoiceNumber ? ` - ${templateData.invoiceNumber}` : ''}`;
        const message =
          templateData.message ||
          this.buildPaymentReminderMessage(templateData);

        sent = await this.emailService.sendCustomEmail({
          to: data.to,
          subject,
          html: this.renderMessageHtml(subject, message),
          tenantId: data.tenantId,
        });
        break;
      }

      case 'payment-escalation': {
        const subject =
          data.subject ||
          `Overdue Escalation${templateData.invoiceNumber ? ` - ${templateData.invoiceNumber}` : ''}`;
        const message = this.buildPaymentEscalationMessage(templateData);

        sent = await this.emailService.sendCustomEmail({
          to: data.to,
          subject,
          html: this.renderMessageHtml(subject, message),
          tenantId: data.tenantId,
        });
        break;
      }

      case 'payment-receipt': {
        const subject =
          data.subject ||
          `Payment Received${templateData.amount ? ` - ${templateData.amount}` : ''}`;
        const message = this.buildPaymentReceiptMessage(templateData);

        sent = await this.emailService.sendCustomEmail({
          to: data.to,
          subject,
          html: this.renderMessageHtml(subject, message),
          tenantId: data.tenantId,
        });
        break;
      }

      case 'quote-followup': {
        const subject =
          data.subject ||
          `Quote Follow-up${templateData.quoteNumber ? ` - ${templateData.quoteNumber}` : ''}`;
        const message =
          templateData.message ||
          this.buildQuoteFollowupMessage(templateData);

        sent = await this.emailService.sendCustomEmail({
          to: data.to,
          subject,
          html: this.renderMessageHtml(subject, message),
          tenantId: data.tenantId,
        });
        break;
      }

      case 'retention-campaign': {
        const subject = data.subject || 'We would love to see you again';
        const message = templateData.message || 'We have a special offer for you.';

        sent = await this.emailService.sendCustomEmail({
          to: data.to,
          subject,
          html: this.renderMessageHtml(subject, message),
          tenantId: data.tenantId,
        });
        break;
      }

      case 'passive-feedback': {
        const subject = data.subject || 'How can we improve?';
        const message = this.buildPassiveFeedbackMessage(templateData);

        sent = await this.emailService.sendCustomEmail({
          to: data.to,
          subject,
          html: this.renderMessageHtml(subject, message),
          tenantId: data.tenantId,
        });
        break;
      }

      default:
        if (data.subject || templateData.message) {
          const subject = data.subject || 'Notification';
          const message = templateData.message || 'You have a new notification.';
          sent = await this.emailService.sendCustomEmail({
            to: data.to,
            subject,
            html: this.renderMessageHtml(subject, message),
            tenantId: data.tenantId,
          });
          this.logger.warn(`Unknown email template, sent generic: ${data.template}`);
        } else {
          this.logger.warn(`Unknown email template: ${data.template}`);
        }
    }

    if (!sent) {
      this.logger.warn(`Email skipped for ${data.to} (template: ${data.template})`);
      return;
    }
    this.logger.log(`Email sent to ${data.to} (template: ${data.template})`);
  }

  private renderMessageHtml(title: string, message: string): string {
    const body = message ? message.replace(/\n/g, '<br>') : '';
    return `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f9fafb; color: #111827; }
          .container { max-width: 640px; margin: 0 auto; padding: 24px; }
          .header { background: #111827; color: #f9fafb; padding: 16px 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .title { margin: 0; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 class="title">${title}</h2>
          </div>
          <div class="content">
            <p>${body}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildAppointmentReminderMessage(data: Record<string, any>): string {
    if (!data.customerName || !data.scheduledAt) {
      return 'This is a reminder about your upcoming appointment.';
    }

    const scheduledAt = new Date(data.scheduledAt);
    const formattedDate = scheduledAt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = scheduledAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return `Hi ${data.customerName}, this is a reminder for your ${data.serviceName || 'appointment'} on ${formattedDate} at ${formattedTime}.`;
  }

  private buildPaymentReminderMessage(data: Record<string, any>): string {
    if (!data.invoiceNumber || !data.amount) {
      return 'This is a reminder that your invoice is overdue. Please reach out if you have questions.';
    }
    return `Your invoice ${data.invoiceNumber} for ${data.amount} is overdue. Please submit payment at your earliest convenience.`;
  }

  private buildPaymentEscalationMessage(data: Record<string, any>): string {
    if (!data.invoiceNumber || !data.customerName || !data.amount) {
      return 'An overdue invoice requires your attention.';
    }
    return `Invoice ${data.invoiceNumber} for ${data.customerName} is significantly overdue. Outstanding balance: ${data.amount}.`;
  }

  private buildPaymentReceiptMessage(data: Record<string, any>): string {
    if (!data.amount) {
      return 'We have received your payment. Thank you!';
    }
    return `We have received your payment of ${data.amount}. Thank you!`;
  }

  private buildQuoteFollowupMessage(data: Record<string, any>): string {
    if (!data.quoteNumber || !data.amount) {
      return 'Just checking in to see if you have any questions about your quote.';
    }
    return `Following up on quote ${data.quoteNumber} for ${data.amount}. Let us know if you would like to move forward.`;
  }

  private buildPassiveFeedbackMessage(data: Record<string, any>): string {
    const businessName = data.businessName || 'Our Team';
    if (data.feedback) {
      return `Thank you for your feedback. We want to make things right.\n\nYour feedback: "${data.feedback}"\n\nReply to this email so ${businessName} can help.`;
    }
    return `We are sorry to hear your experience was not perfect. Please reply to this email so ${businessName} can make it right.`;
  }
}
