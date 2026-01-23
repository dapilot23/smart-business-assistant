import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface AppointmentData {
  id: string;
  scheduledAt: Date;
  duration: number;
  notes?: string;
  service?: {
    name: string;
  };
}

export interface CustomerData {
  name: string;
  phone: string;
}

export interface SmsResult {
  recipient: string;
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: Twilio | null = null;
  private readonly fromNumber: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    this.isConfigured = !!(accountSid && authToken && this.fromNumber);

    if (this.isConfigured) {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.logger.log('Twilio SMS service initialized successfully');
    } else {
      this.logger.warn(
        'Twilio credentials not configured. SMS functionality will be disabled.',
      );
    }
  }

  async sendSms(to: string, message: string): Promise<any> {
    if (!this.isConfigured || !this.twilioClient) {
      throw new BadRequestException(
        'SMS service is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.',
      );
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.fromNumber,
        to: to,
      });

      this.logger.log(`SMS sent successfully to ${to}. SID: ${result.sid}`);
      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error);
      throw new BadRequestException(
        `Failed to send SMS: ${error.message || 'Unknown error'}`,
      );
    }
  }

  async sendAppointmentConfirmation(
    appointment: AppointmentData,
    customer: CustomerData,
  ): Promise<any> {
    const scheduledDate = new Date(appointment.scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const serviceName = appointment.service?.name || 'Service';

    const message = `Hi ${customer.name}! Your ${serviceName} appointment is confirmed for ${formattedDate} at ${formattedTime}. We look forward to seeing you!`;

    return this.sendSms(customer.phone, message);
  }

  async sendAppointmentReminder(
    appointment: AppointmentData,
    customer: CustomerData,
  ): Promise<any> {
    const scheduledDate = new Date(appointment.scheduledAt);
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const serviceName = appointment.service?.name || 'appointment';

    const message = `Reminder: You have a ${serviceName} scheduled today at ${formattedTime}. See you soon!`;

    return this.sendSms(customer.phone, message);
  }

  async sendBulkSms(
    recipients: string[],
    message: string,
  ): Promise<{ success: number; failed: number; results: SmsResult[] }> {
    if (!this.isConfigured || !this.twilioClient) {
      throw new BadRequestException('SMS service is not configured.');
    }

    const results: SmsResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        const result = await this.sendSms(recipient, message);
        results.push({ recipient, success: true, ...result });
        successCount++;
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error.message,
        });
        failedCount++;
        this.logger.error(`Failed to send bulk SMS to ${recipient}:`, error);
      }
    }

    this.logger.log(
      `Bulk SMS completed: ${successCount} sent, ${failedCount} failed`,
    );

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  async sendQuote(
    customerPhone: string,
    customerName: string,
    quoteNumber: string,
    amount: number,
    validUntil: Date,
    quoteUrl?: string,
  ): Promise<any> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    const formattedDate = new Date(validUntil).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    let message = `Hi ${customerName}! Your quote ${quoteNumber} for ${formattedAmount} is ready. Valid until ${formattedDate}.`;

    if (quoteUrl) {
      message += ` View it here: ${quoteUrl}`;
    }

    message += ' Reply YES to accept or call us with questions.';

    return this.sendSms(customerPhone, message);
  }

  async sendInvoice(
    customerPhone: string,
    customerName: string,
    invoiceNumber: string,
    amountDue: number,
    dueDate: Date,
    paymentUrl?: string,
  ): Promise<any> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountDue);

    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    let message = `Hi ${customerName}! Invoice ${invoiceNumber} for ${formattedAmount} is now ready. Payment due by ${formattedDate}.`;

    if (paymentUrl) {
      message += ` Pay online: ${paymentUrl}`;
    }

    message += ' Please contact us if you have any questions.';

    return this.sendSms(customerPhone, message);
  }

  async testConfiguration(to: string): Promise<any> {
    const message = 'Test message from Smart Business Assistant. SMS is working correctly!';
    return this.sendSms(to, message);
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  async handleWebhook(data: any) {
    this.logger.log('Twilio webhook received:', JSON.stringify(data));
    return { received: true };
  }
}
