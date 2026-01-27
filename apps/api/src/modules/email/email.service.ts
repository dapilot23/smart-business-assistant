import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  scheduledAt: Date;
  duration: number;
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
  confirmationCode?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly isConfigured: boolean;
  private readonly fromEmail: string;
  private emailBreaker: any | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'noreply@example.com';
    this.isConfigured = !!apiKey;

    if (this.isConfigured && apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn('Resend not configured - RESEND_API_KEY missing');
    }
  }

  onModuleInit() {
    if (this.isConfigured && this.resend) {
      this.emailBreaker = this.circuitBreakerService.createBreaker(
        'resend-email',
        this.sendEmailInternal.bind(this),
        {
          timeout: 10000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
        },
      );
    }
  }

  private async sendEmailInternal(params: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<unknown> {
    if (!this.resend) {
      throw new Error('Resend client not initialized');
    }
    return this.resend.emails.send(params);
  }

  async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
    if (!this.isConfigured || !this.resend) {
      this.logger.warn('Email service not configured, skipping booking confirmation');
      return false;
    }

    const formattedDate = data.scheduledAt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const formattedTime = data.scheduledAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    try {
      const emailParams = {
        from: this.fromEmail,
        to: data.customerEmail,
        subject: `Appointment Confirmed - ${data.serviceName}`,
        html: this.getBookingConfirmationHtml(data, formattedDate, formattedTime),
      };

      if (this.emailBreaker) {
        await this.emailBreaker.fire(emailParams);
      } else {
        await this.sendEmailInternal(emailParams);
      }

      this.logger.log(`Booking confirmation email sent to ${data.customerEmail}`);
      return true;
    } catch (error) {
      if (error.message?.includes('Breaker is open')) {
        this.logger.warn('Email circuit breaker is open, email temporarily unavailable');
        return false;
      }
      this.logger.error(`Failed to send booking confirmation email: ${error.message}`);
      return false;
    }
  }

  async sendBookingCancellation(data: BookingEmailData): Promise<boolean> {
    if (!this.isConfigured || !this.resend) {
      return false;
    }

    const formattedDate = data.scheduledAt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const formattedTime = data.scheduledAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    try {
      const emailParams = {
        from: this.fromEmail,
        to: data.customerEmail,
        subject: `Appointment Cancelled - ${data.serviceName}`,
        html: this.getCancellationHtml(data, formattedDate, formattedTime),
      };

      if (this.emailBreaker) {
        await this.emailBreaker.fire(emailParams);
      } else {
        await this.sendEmailInternal(emailParams);
      }

      this.logger.log(`Cancellation email sent to ${data.customerEmail}`);
      return true;
    } catch (error) {
      if (error.message?.includes('Breaker is open')) {
        this.logger.warn('Email circuit breaker is open, email temporarily unavailable');
        return false;
      }
      this.logger.error(`Failed to send cancellation email: ${error.message}`);
      return false;
    }
  }

  async sendBookingRescheduled(
    data: BookingEmailData,
    oldDate: Date,
  ): Promise<boolean> {
    if (!this.isConfigured || !this.resend) {
      return false;
    }

    const oldFormattedDate = oldDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const newFormattedDate = data.scheduledAt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const newFormattedTime = data.scheduledAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    try {
      const emailParams = {
        from: this.fromEmail,
        to: data.customerEmail,
        subject: `Appointment Rescheduled - ${data.serviceName}`,
        html: this.getRescheduleHtml(data, oldFormattedDate, newFormattedDate, newFormattedTime),
      };

      if (this.emailBreaker) {
        await this.emailBreaker.fire(emailParams);
      } else {
        await this.sendEmailInternal(emailParams);
      }

      this.logger.log(`Reschedule email sent to ${data.customerEmail}`);
      return true;
    } catch (error) {
      if (error.message?.includes('Breaker is open')) {
        this.logger.warn('Email circuit breaker is open, email temporarily unavailable');
        return false;
      }
      this.logger.error(`Failed to send reschedule email: ${error.message}`);
      return false;
    }
  }

  private getBookingConfirmationHtml(
    data: BookingEmailData,
    formattedDate: string,
    formattedTime: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .detail-label { font-weight: 600; width: 120px; color: #6b7280; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 5px; }
          .btn-outline { background: transparent; border: 1px solid #d1d5db; color: #374151; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Appointment Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Your appointment has been confirmed. Here are the details:</p>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Service</span>
                <span>${data.serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span>${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time</span>
                <span>${formattedTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration</span>
                <span>${data.duration} minutes</span>
              </div>
              ${data.confirmationCode ? `
              <div class="detail-row">
                <span class="detail-label">Confirmation</span>
                <span><strong>${data.confirmationCode}</strong></span>
              </div>
              ` : ''}
            </div>

            ${data.cancelUrl || data.rescheduleUrl ? `
            <p style="text-align: center; margin-top: 20px;">
              ${data.rescheduleUrl ? `<a href="${data.rescheduleUrl}" class="btn">Reschedule</a>` : ''}
              ${data.cancelUrl ? `<a href="${data.cancelUrl}" class="btn btn-outline">Cancel Appointment</a>` : ''}
            </p>
            ` : ''}
          </div>
          <div class="footer">
            <p><strong>${data.businessName}</strong></p>
            <p>${data.businessEmail}${data.businessPhone ? ` | ${data.businessPhone}` : ''}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getCancellationHtml(
    data: BookingEmailData,
    formattedDate: string,
    formattedTime: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Appointment Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Your appointment has been cancelled:</p>

            <div class="details">
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Original Date:</strong> ${formattedDate} at ${formattedTime}</p>
            </div>

            <p>If you'd like to book a new appointment, please visit our booking page or contact us.</p>
          </div>
          <div class="footer">
            <p><strong>${data.businessName}</strong></p>
            <p>${data.businessEmail}${data.businessPhone ? ` | ${data.businessPhone}` : ''}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getRescheduleHtml(
    data: BookingEmailData,
    oldDate: string,
    newDate: string,
    newTime: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .old-time { text-decoration: line-through; color: #9ca3af; }
          .new-time { color: #10b981; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Appointment Rescheduled</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Your appointment has been rescheduled:</p>

            <div class="details">
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><span class="old-time">Previous: ${oldDate}</span></p>
              <p><span class="new-time">New: ${newDate} at ${newTime}</span></p>
              <p><strong>Duration:</strong> ${data.duration} minutes</p>
            </div>

            <p>We look forward to seeing you!</p>
          </div>
          <div class="footer">
            <p><strong>${data.businessName}</strong></p>
            <p>${data.businessEmail}${data.businessPhone ? ` | ${data.businessPhone}` : ''}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}
