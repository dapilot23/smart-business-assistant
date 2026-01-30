import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';
import { EventsService } from '../../config/events/events.service';
import { EVENTS, AppointmentEventPayload, MessageEventPayload } from '../../config/events/events.types';
import { BroadcastStatus, ChannelType, CommunicationChannel, UserRole } from '@prisma/client';
import { ConversationService } from '../messaging/conversation.service';

export interface AppointmentData {
  id: string;
  scheduledAt: Date;
  duration: number;
  notes?: string;
  tenantId?: string;
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
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: Twilio | null = null;
  private readonly fromNumber: string;
  private readonly isConfigured: boolean;
  private smsBreaker: any | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly eventsService: EventsService,
    private readonly conversations: ConversationService,
  ) {
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

  onModuleInit() {
    if (this.isConfigured && this.twilioClient) {
      this.smsBreaker = this.circuitBreakerService.createBreaker(
        'twilio-sms',
        this.sendSmsInternal.bind(this),
        {
          timeout: 15000,
          errorThresholdPercentage: 50,
          resetTimeout: 60000,
        },
      );
    }
  }

  private async sendSmsInternal(to: string, message: string): Promise<unknown> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }
    return this.twilioClient.messages.create({
      body: message,
      from: this.fromNumber,
      to: to,
    });
  }

  async sendSms(
    to: string,
    message: string,
    options?: { tenantId?: string; skipOptOutCheck?: boolean },
  ): Promise<any> {
    if (!this.isConfigured || !this.twilioClient) {
      throw new BadRequestException(
        'SMS service is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.',
      );
    }

    if (options?.tenantId && !options.skipOptOutCheck) {
      const optedOut = await this.isOptedOut(to, options.tenantId);
      if (optedOut) {
        this.logger.warn(`Skipping SMS to opted-out number: ${to}`);
        return { success: false, skipped: true, reason: 'opted_out' };
      }
    }

    try {
      let result: any;
      if (this.smsBreaker) {
        result = await this.smsBreaker.fire(to, message);
      } else {
        result = await this.sendSmsInternal(to, message);
      }

      this.logger.log(`SMS sent successfully to ${to}. SID: ${result.sid}`);
      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error);
      if (error.message?.includes('Breaker is open')) {
        throw new BadRequestException(
          'SMS service temporarily unavailable. Please try again later.',
        );
      }
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

    return this.sendSms(customer.phone, message, {
      tenantId: appointment.tenantId,
    });
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

    return this.sendSms(customer.phone, message, {
      tenantId: appointment.tenantId,
    });
  }

  async sendBulkSms(
    recipients: string[],
    message: string,
    tenantId?: string,
  ): Promise<{ success: number; failed: number; results: SmsResult[] }> {
    if (!this.isConfigured || !this.twilioClient) {
      throw new BadRequestException('SMS service is not configured.');
    }

    const results: SmsResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        const result = await this.sendSms(recipient, message, { tenantId });
        if (result?.skipped) {
          results.push({
            recipient,
            success: false,
            error: 'Recipient opted out',
          });
          failedCount++;
          continue;
        }
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
    tenantId?: string,
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

    return this.sendSms(customerPhone, message, { tenantId });
  }

  async sendInvoice(
    customerPhone: string,
    customerName: string,
    invoiceNumber: string,
    amountDue: number,
    dueDate: Date,
    paymentUrl?: string,
    tenantId?: string,
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

    return this.sendSms(customerPhone, message, { tenantId });
  }

  async testConfiguration(to: string, tenantId?: string): Promise<any> {
    const message = 'Test message from Smart Business Assistant. SMS is working correctly!';
    return this.sendSms(to, message, { tenantId });
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  async handleWebhook(data: any) {
    return this.prisma.withSystemContext(async () => {
      this.logger.log('Twilio webhook received');

      const inbound = this.getInboundPayload(data);
      if (!inbound) return { received: true };

      const optResult = await this.handleOptOutCommand(inbound.from, inbound.body);
      const appointmentHandled = await this.handleAppointmentCommand(inbound.from, inbound.body);
      const skipAi = optResult.skipAi || appointmentHandled;

      const recorded = await this.recordInboundMessage(inbound.from, inbound.rawBody);
      if (recorded) {
        this.emitInboundMessageEvent(recorded, skipAi);
      }

      return { received: true, optedOut: optResult.optedOut, optedIn: optResult.optedIn };
    });
  }

  private getInboundPayload(data: any) {
    const from = data.From;
    const rawBody = (data.Body || '').trim();
    const body = rawBody.toUpperCase();
    if (!from || !rawBody) return null;
    return { from, rawBody, body };
  }

  private async handleOptOutCommand(from: string, body: string) {
    if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(body)) {
      await this.recordOptOut(from, 'SMS_STOP');
      await this.sendSms(
        from,
        'You are unsubscribed. Reply START to opt back in.',
        { skipOptOutCheck: true },
      );
      return { skipAi: true, optedOut: true, optedIn: false };
    }

    if (['START', 'UNSTOP'].includes(body)) {
      await this.removeOptOut(from);
      await this.sendSms(
        from,
        'You are resubscribed and will receive messages again.',
        { skipOptOutCheck: true },
      );
      return { skipAi: true, optedOut: false, optedIn: true };
    }

    return { skipAi: false, optedOut: false, optedIn: false };
  }

  private async handleAppointmentCommand(from: string, body: string) {
    if (body === 'C' || body === 'CONFIRM' || body === 'YES') {
      await this.handleConfirmation(from);
      return true;
    }
    if (body === 'R' || body === 'RESCHEDULE') {
      await this.handleRescheduleRequest(from);
      return true;
    }
    return false;
  }

  private emitInboundMessageEvent(
    recorded: { tenantId: string; conversationId: string; messageId: string },
    skipAi: boolean,
  ) {
    this.eventsService.emit<MessageEventPayload>(EVENTS.MESSAGE_RECEIVED, {
      tenantId: recorded.tenantId,
      conversationId: recorded.conversationId,
      messageId: recorded.messageId,
      channel: 'SMS',
      skipAi,
    });
  }

  private async recordInboundMessage(phone: string, content: string) {
    const context = await this.resolveInboundContext(phone);
    if (!context) {
      this.logger.warn(`Inbound SMS from ${phone} could not be matched to a tenant`);
      return null;
    }

    const conversation = await this.conversations.createConversation(context.tenantId, {
      customerId: context.customerId,
      customerName: context.customerName,
      customerPhone: context.customerPhone,
      channel: ChannelType.SMS,
      subject: 'SMS',
      initialMessage: undefined,
    });

    const message = await this.conversations.addMessage(
      context.tenantId,
      conversation.id,
      {
        content,
        direction: 'INBOUND',
        senderName: context.customerName,
        senderPhone: context.customerPhone,
      },
    );

    return {
      tenantId: context.tenantId,
      conversationId: conversation.id,
      messageId: message.id,
    };
  }

  private async resolveInboundContext(phone: string) {
    const fromConversation = await this.findContextFromConversation(phone);
    if (fromConversation) return fromConversation;

    const fromCustomer = await this.findContextFromCustomer(phone);
    if (fromCustomer) return fromCustomer;

    const fromAppointment = await this.findContextFromAppointment(phone);
    if (fromAppointment) return fromAppointment;

    return this.createFallbackCustomer(phone);
  }

  private async findContextFromConversation(phone: string) {
    const fromConversation = await this.prisma.conversationThread.findFirst({
      where: { customerPhone: phone },
      orderBy: { lastMessageAt: 'desc' },
      select: { tenantId: true, customerId: true, customerName: true, customerPhone: true },
    });

    if (!fromConversation) return null;

    return {
      tenantId: fromConversation.tenantId,
      customerId: fromConversation.customerId,
      customerName: fromConversation.customerName || 'Customer',
      customerPhone: fromConversation.customerPhone,
    };
  }

  private async findContextFromCustomer(phone: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { phone },
      select: { id: true, tenantId: true, name: true, phone: true },
    });

    if (!customer) return null;

    return {
      tenantId: customer.tenantId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
    };
  }

  private async findContextFromAppointment(phone: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { customer: { phone } },
      include: { customer: true },
      orderBy: { scheduledAt: 'desc' },
    });

    if (!appointment?.customer) return null;

    return {
      tenantId: appointment.tenantId,
      customerId: appointment.customerId,
      customerName: appointment.customer.name,
      customerPhone: appointment.customer.phone,
    };
  }

  private async createFallbackCustomer(phone: string) {
    const tenant = await this.getSingleTenant();
    if (!tenant) return null;

    const created = await this.prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'New SMS Contact',
        phone,
      },
    });

    return {
      tenantId: tenant.id,
      customerId: created.id,
      customerName: created.name,
      customerPhone: created.phone,
    };
  }

  private async getSingleTenant() {
    const count = await this.prisma.tenant.count();
    if (count !== 1) return null;
    return this.prisma.tenant.findFirst({ select: { id: true } });
  }

  private async handleConfirmation(phone: string) {
    const appointment = await this.findUpcomingByPhone(phone);
    if (!appointment) return;

    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { confirmedAt: new Date(), status: 'CONFIRMED' },
    });

    await this.sendSms(
      phone,
      `Great! Your appointment is confirmed. See you soon!`,
      { tenantId: appointment.tenantId },
    );

    this.eventsService.emit<AppointmentEventPayload>(
      EVENTS.APPOINTMENT_CONFIRMED,
      {
        tenantId: appointment.tenantId,
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        customerName: appointment.customer.name,
        customerPhone: appointment.customer.phone,
        customerEmail: appointment.customer.email || undefined,
        scheduledAt: appointment.scheduledAt,
        serviceName: appointment.service?.name,
      },
    );

    this.logger.log(`Appointment ${appointment.id} confirmed via SMS`);
  }

  private async handleRescheduleRequest(phone: string) {
    const appointment = await this.findUpcomingByPhone(phone);
    if (!appointment || !appointment.manageToken) return;

    const baseUrl = this.configService.get('FRONTEND_URL') || 'https://app.example.com';
    await this.sendSms(
      phone,
      `To reschedule your appointment: ${baseUrl}/booking/manage/${appointment.manageToken}`,
      { tenantId: appointment.tenantId },
    );

    this.logger.log(`Reschedule link sent for appointment ${appointment.id}`);
  }

  private async findUpcomingByPhone(phone: string) {
    return this.prisma.appointment.findFirst({
      where: {
        customer: { phone },
        scheduledAt: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { customer: true, service: true },
    });
  }

  async createBroadcast(
    tenantId: string,
    message: string,
    targetRoles: UserRole[] = [],
    sentBy: string,
  ) {
    const where: any = {
      tenantId,
      status: 'ACTIVE',
      phone: { not: null },
    };

    if (targetRoles && targetRoles.length > 0) {
      where.role = { in: targetRoles };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        phone: true,
        name: true,
      },
    });

    const recipients = users.filter((user) => user.phone !== null);

    const broadcast = await this.prisma.smsBroadcast.create({
      data: {
        tenantId,
        message,
        sentBy,
        targetRoles: targetRoles || [],
        recipientCount: recipients.length,
        status: BroadcastStatus.PENDING,
        recipients: {
          create: recipients.map((user) => ({
            userId: user.id,
            phone: user.phone as string,
            status: 'pending',
          })),
        },
      },
      include: {
        recipients: true,
      },
    });

    this.logger.log(
      `Broadcast created: ${broadcast.id} with ${recipients.length} recipients`,
    );

    return broadcast;
  }

  async sendBroadcast(broadcastId: string) {
    const broadcast = await this.prisma.smsBroadcast.findUnique({
      where: { id: broadcastId },
      include: {
        recipients: {
          where: { status: 'pending' },
        },
      },
    });

    if (!broadcast) {
      throw new NotFoundException('Broadcast not found');
    }

    if (broadcast.status !== BroadcastStatus.PENDING) {
      throw new BadRequestException(
        `Cannot send broadcast with status: ${broadcast.status}`,
      );
    }

    await this.prisma.smsBroadcast.update({
      where: { id: broadcastId },
      data: { status: BroadcastStatus.SENDING },
    });

    let successCount = 0;
    let failureCount = 0;

    for (const recipient of broadcast.recipients) {
      try {
        const result = await this.sendSms(recipient.phone, broadcast.message, {
          tenantId: broadcast.tenantId,
        });

        if (result?.skipped) {
          await this.prisma.smsBroadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'failed',
              error: 'Recipient opted out',
            },
          });
          failureCount++;
          continue;
        }

        await this.prisma.smsBroadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });

        successCount++;
      } catch (error) {
        await this.prisma.smsBroadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'failed',
            error: error.message,
          },
        });

        failureCount++;
        this.logger.error(
          `Failed to send broadcast SMS to ${recipient.phone}:`,
          error,
        );
      }
    }

    await this.prisma.smsBroadcast.update({
      where: { id: broadcastId },
      data: {
        status: BroadcastStatus.COMPLETED,
        successCount,
        failureCount,
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Broadcast ${broadcastId} completed: ${successCount} sent, ${failureCount} failed`,
    );

    return {
      broadcastId,
      successCount,
      failureCount,
      totalRecipients: broadcast.recipients.length,
    };
  }

  async getBroadcasts(tenantId: string) {
    return this.prisma.smsBroadcast.findMany({
      where: { tenantId },
      include: {
        recipients: {
          select: {
            id: true,
            phone: true,
            status: true,
            sentAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBroadcast(tenantId: string, broadcastId: string) {
    const broadcast = await this.prisma.smsBroadcast.findUnique({
      where: { id: broadcastId },
      include: {
        recipients: {
          select: {
            id: true,
            userId: true,
            phone: true,
            status: true,
            error: true,
            sentAt: true,
          },
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!broadcast) {
      throw new NotFoundException('Broadcast not found');
    }

    if (broadcast.tenantId !== tenantId) {
      throw new BadRequestException('Access denied');
    }

    return broadcast;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  private async isOptedOut(phone: string, tenantId: string): Promise<boolean> {
    const normalized = this.normalizePhone(phone);
    const entry = await this.prisma.communicationOptOut.findFirst({
      where: {
        tenantId,
        channel: CommunicationChannel.SMS,
        value: normalized,
      },
      select: { id: true },
    });

    return Boolean(entry);
  }

  private async recordOptOut(phone: string, source?: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    const phoneCandidates = new Set<string>([
      phone,
      normalized,
      normalized.startsWith('+') ? normalized : `+${normalized}`,
    ]);
    const customers = await this.prisma.customer.findMany({
      where: { phone: { in: Array.from(phoneCandidates) } },
      select: { tenantId: true },
    });

    const tenantIds = Array.from(new Set(customers.map((c) => c.tenantId)));
    if (tenantIds.length === 0) {
      this.logger.warn(`Opt-out received for unknown phone: ${phone}`);
      return;
    }

    await Promise.all(
      tenantIds.map((tenantId) =>
        this.prisma.communicationOptOut.upsert({
          where: {
            tenantId_channel_value: {
              tenantId,
              channel: CommunicationChannel.SMS,
              value: normalized,
            },
          },
          update: { source },
          create: {
            tenantId,
            channel: CommunicationChannel.SMS,
            value: normalized,
            source,
          },
        }),
      ),
    );
  }

  private async removeOptOut(phone: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    await this.prisma.communicationOptOut.deleteMany({
      where: {
        channel: CommunicationChannel.SMS,
        value: normalized,
      },
    });
  }
}
