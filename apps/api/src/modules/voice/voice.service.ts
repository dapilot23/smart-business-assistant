import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VapiClient } from '@vapi-ai/server-sdk';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { OutboundCallDto } from './dto/outbound-call.dto';
import { CallStatus } from '@prisma/client';
import {
  CustomerContextService,
  CustomerVoiceContext,
} from '../customer-context/customer-context.service';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';
import { PublicBookingService } from '../public-booking/public-booking.service';

@Injectable()
export class VoiceService implements OnModuleInit {
  private readonly logger = new Logger(VoiceService.name);
  private vapiClient: VapiClient | null = null;
  private readonly isConfigured: boolean;
  private vapiBreaker: any | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly customerContext: CustomerContextService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly publicBookingService: PublicBookingService,
  ) {
    const apiKey = this.configService.get<string>('VAPI_API_KEY');
    this.isConfigured = !!apiKey && apiKey.length > 0;

    if (this.isConfigured && apiKey) {
      this.vapiClient = new VapiClient({ token: apiKey });
      this.logger.log('Vapi.ai integration initialized');
    } else {
      this.logger.warn('Vapi.ai not configured - VAPI_API_KEY missing');
    }
  }

  onModuleInit() {
    if (this.isConfigured && this.vapiClient) {
      this.vapiBreaker = this.circuitBreakerService.createBreaker(
        'vapi-voice',
        async (fn: () => Promise<unknown>) => fn(),
        {
          timeout: 30000,
          errorThresholdPercentage: 50,
          resetTimeout: 60000,
        },
      );
    }
  }

  private async callVapi<T>(fn: () => Promise<T>): Promise<T> {
    if (this.vapiBreaker) {
      return this.vapiBreaker.fire(fn) as Promise<T>;
    }
    return fn();
  }

  private ensureConfigured(): void {
    if (!this.isConfigured || !this.vapiClient) {
      throw new BadRequestException('Vapi.ai is not configured');
    }
  }

  async createAssistant(config: CreateAssistantDto & { tenantId?: string }) {
    this.ensureConfigured();

    // Get tenant info for personalized assistant
    const tenant = config.tenantId
      ? await this.prisma.withTenantContext(
          config.tenantId,
          () => this.prisma.tenant.findUnique({ where: { id: config.tenantId } }),
        )
      : null;

    const businessName = tenant?.name || config.name || 'our business';
    const functions = config.functions || this.getBookingFunctionDefinitions();

    const assistantConfig: any = {
      name: config.name || `${businessName} Assistant`,
      model: {
        provider: 'openai',
        model: config.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: config.systemPrompt || this.getBookingSystemPrompt(businessName),
          },
        ],
        functions: functions,
      },
      voice: {
        provider: 'azure',
        voiceId: config.voice || 'andrew',
      },
      firstMessage:
        config.firstMessage ||
        `Hello! Thank you for calling ${businessName}. I can help you book an appointment, check our available services, or answer questions. How can I help you today?`,
      transcriber: config.transcriber || {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
      },
      serverUrl: this.configService.get('VAPI_WEBHOOK_URL'),
      serverUrlSecret: this.configService.get('VAPI_WEBHOOK_SECRET'),
    };

    const assistant = await this.callVapi(() =>
      this.vapiClient!.assistants.create(assistantConfig)
    );
    this.logger.log(`Created assistant: ${(assistant as any).id}`);
    return assistant;
  }

  /**
   * Get assistant configuration for dynamic assistant request from Vapi
   * Now includes customer context for personalized interactions
   */
  async getAssistantConfigWithContext(
    tenantId: string,
    callerPhone?: string,
  ): Promise<{
    assistant: any;
    customerContext: CustomerVoiceContext | null;
  }> {
    return this.prisma.withTenantContext(tenantId, async () => {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      const businessName = tenant?.name || 'our business';

      // Get customer context if phone is available
      let context: CustomerVoiceContext | null = null;
      if (callerPhone) {
        context = await this.customerContext.getContextByPhone(tenantId, callerPhone);
        if (context) {
          await this.customerContext.recordInteraction(context.customerId);
        }
      }

      // Build personalized first message
      const firstMessage = this.customerContext.buildGreeting(context, businessName);

      // Build personalized system prompt with customer context
      const systemPrompt = this.getPersonalizedSystemPrompt(businessName, context);

      return {
        assistant: {
          model: {
            provider: 'openai',
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
            ],
            functions: this.getBookingFunctionDefinitions(),
          },
          voice: {
            provider: 'azure',
            voiceId: 'andrew',
          },
          firstMessage,
          transcriber: {
            provider: 'deepgram',
            model: 'nova-2',
            language: 'en',
          },
        },
        customerContext: context,
      };
    });
  }

  /**
   * Get assistant configuration for dynamic assistant request from Vapi
   * @deprecated Use getAssistantConfigWithContext for personalized interactions
   */
  getAssistantConfig(tenantId: string, tenant?: any) {
    const businessName = tenant?.name || 'our business';

    return {
      model: {
        provider: 'openai',
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: this.getBookingSystemPrompt(businessName),
          },
        ],
        functions: this.getBookingFunctionDefinitions(),
      },
      voice: {
        provider: 'azure',
        voiceId: 'andrew',
      },
      firstMessage: `Hello! Thank you for calling ${businessName}. I can help you book an appointment, check our available services, or answer questions. How can I help you today?`,
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
      },
    };
  }

  async makeOutboundCall(dto: OutboundCallDto, tenantId: string) {
    this.ensureConfigured();
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required to place a call');
    }

    return this.prisma.withTenantContext(tenantId, async () => {
      const assistant = dto.assistantId
        ? { assistantId: dto.assistantId }
        : await this.getOrCreateDefaultAssistant(tenantId);

      const callConfig: any = {
        ...assistant,
        customer: {
          number: dto.phoneNumber,
        },
        ...(dto.metadata && { metadata: dto.metadata }),
      };

      const call = await this.callVapi(() =>
        this.vapiClient!.calls.create(callConfig)
      );
      const callId = (call as any).id || 'unknown';

      await this.prisma.callLog.create({
        data: {
          tenantId,
          vapiCallId: callId,
          callerPhone: dto.phoneNumber,
          direction: 'OUTBOUND',
          status: 'QUEUED',
          metadata: dto.metadata || {},
        },
      });

      this.logger.log(`Outbound call initiated: ${callId}`);
      return call;
    });
  }

  async handleIncomingCall(callData: any, tenantId: string) {
    this.logger.log(`Incoming call webhook: ${callData.id}`);

    return this.prisma.withTenantContext(tenantId, async () => {
      const existingLog = await this.prisma.callLog.findUnique({
        where: { vapiCallId: callData.id },
      });

      if (!existingLog) {
        await this.prisma.callLog.create({
          data: {
            tenantId,
            vapiCallId: callData.id,
            callerPhone: callData.customer?.number || 'unknown',
            direction: 'INBOUND',
            status: 'IN_PROGRESS',
            metadata: callData,
          },
        });
      }

      return { received: true };
    });
  }

  async handleCallStatusUpdate(callData: any) {
    this.logger.log(`Call status update: ${callData.id} - ${callData.status}`);

    return this.prisma.withSystemContext(async () => {
      await this.prisma.callLog.updateMany({
        where: { vapiCallId: callData.id },
        data: {
          status: this.mapVapiStatus(callData.status),
          metadata: callData,
        },
      });

      return { received: true };
    });
  }

  async handleCallEnd(callData: any) {
    this.logger.log(`Call ended: ${callData.call?.id}`);

    const callId = callData.call?.id;
    if (!callId) {
      this.logger.warn('Call end event missing call ID');
      return { received: true };
    }

    return this.prisma.withSystemContext(async () => {
      await this.prisma.callLog.updateMany({
        where: { vapiCallId: callId },
        data: {
          status: 'ENDED',
          duration: callData.duration || 0,
          transcript: callData.transcript || '',
          summary: callData.summary || '',
          metadata: callData,
        },
      });

      return { received: true };
    });
  }

  async handleFunctionCall(functionCallData: any) {
    this.logger.log(`Function call: ${functionCallData.functionCall?.name}`);

    const { name, parameters } = functionCallData.functionCall || {};
    const tenantId = functionCallData.call?.metadata?.tenantId;
    const callerPhone = functionCallData.call?.customer?.number;

    if (!tenantId) {
      this.logger.warn('Function call missing tenantId in metadata');
      return { result: 'Sorry, I encountered an error. Please try again.' };
    }

    try {
      switch (name) {
        case 'getServices':
          return this.handleGetServices(tenantId);
        case 'getAvailableSlots':
          return this.handleGetAvailableSlots(tenantId, parameters);
        case 'bookAppointment':
          return this.handleBookAppointment(tenantId, callerPhone, parameters);
        case 'getBusinessInfo':
          return this.handleGetBusinessInfo(tenantId);
        case 'transferToHuman':
          return this.handleTransferToHuman(parameters, functionCallData);
        default:
          this.logger.warn(`Unknown function: ${name}`);
          return { result: 'Sorry, I cannot help with that request.' };
      }
    } catch (error) {
      this.logger.error(`Function call error: ${error.message}`);
      return { result: 'Sorry, something went wrong. Please try again.' };
    }
  }

  async getCallLogs(tenantId: string, limit = 50) {
    return this.prisma.withTenantContext(tenantId, () =>
      this.prisma.callLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    );
  }

  private async getOrCreateDefaultAssistant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const config: CreateAssistantDto = {
      name: `${tenant?.name || 'Business'} Assistant`,
      firstMessage: `Hello! You've reached ${tenant?.name || 'our business'}. How can I help you today?`,
      systemPrompt: this.getDefaultSystemPrompt(),
    };

    const assistant = await this.createAssistant(config);
    return { assistantId: assistant.id };
  }

  private getDefaultSystemPrompt(): string {
    return this.getBookingSystemPrompt('our business');
  }

  /**
   * Build personalized system prompt with customer context
   */
  private getPersonalizedSystemPrompt(
    businessName: string,
    context: CustomerVoiceContext | null,
  ): string {
    let basePrompt = this.getBookingSystemPrompt(businessName);

    if (context && context.isReturningCustomer) {
      const contextSection = `

## Customer Context (IMPORTANT - Use this to personalize the conversation)
- Customer Name: ${context.name}
- Returning Customer: Yes (${context.totalVisits} previous visits)
- Total Spent: $${context.totalSpent.toFixed(2)}
${context.lastServiceType ? `- Last Service: ${context.lastServiceType}` : ''}
${context.preferredTime ? `- Preferred Time: ${context.preferredTime}` : ''}
${context.aiSummary ? `- AI Notes: ${context.aiSummary}` : ''}
${context.upcomingAppointment ? `- Upcoming Appointment: ${context.upcomingAppointment.serviceName} on ${context.upcomingAppointment.date.toLocaleDateString()}` : ''}
${context.pendingInvoice ? `- Pending Invoice: $${context.pendingInvoice.amount.toFixed(2)} due ${context.pendingInvoice.dueDate.toLocaleDateString()}` : ''}

## Personalization Guidelines
- Address the customer by name naturally in conversation
- Reference their history when relevant (e.g., "Would you like to book another [last service]?")
- If they have an upcoming appointment, mention it if they seem to be calling about scheduling
- If they have a pending invoice, mention it if the conversation turns to payments
- Don't be overly familiar, but show that you remember them
`;
      basePrompt = basePrompt + contextSection;
    }

    return basePrompt;
  }

  private getBookingSystemPrompt(businessName: string): string {
    return `You are a friendly and professional AI phone assistant for ${businessName}. Your primary role is to help callers book appointments.

## Your Capabilities
- Book appointments for customers
- Check available services and time slots
- Provide business information
- Transfer to a human when you cannot help

## Booking Flow
1. First, greet the caller warmly
2. If they want to book, use getServices to show available services
3. Ask which service they need
4. Use getAvailableSlots to check availability for their preferred date
5. Confirm their preferred time slot
6. Ask for their name (required for booking)
7. Use bookAppointment to complete the booking
8. Confirm the booking details and confirmation code

## Important Guidelines
- Be conversational and natural, not robotic
- Keep responses concise - phone conversations should be quick
- If someone asks for something you can't do, offer to transfer to a human
- Always confirm important details before booking
- The caller's phone number is automatically captured - you don't need to ask for it
- If the caller seems confused or frustrated, offer to transfer them to a human

## Example Phrases
- "I'd be happy to help you book an appointment!"
- "Let me check what times are available..."
- "I've got you booked for [service] on [date] at [time]. Your confirmation code is [code]."
- "Would you like me to transfer you to one of our team members?"

Remember: Your goal is to make booking as easy as possible while being friendly and professional.`;
  }

  private mapVapiStatus(vapiStatus: string): CallStatus {
    const statusMap: Record<string, CallStatus> = {
      queued: CallStatus.QUEUED,
      ringing: CallStatus.RINGING,
      'in-progress': CallStatus.IN_PROGRESS,
      forwarding: CallStatus.FORWARDING,
      ended: CallStatus.ENDED,
      failed: CallStatus.FAILED,
    };
    return statusMap[vapiStatus] || CallStatus.QUEUED;
  }

  private async handleGetServices(tenantId: string) {
    this.logger.log(`Getting services for tenant: ${tenantId}`);

    const services = await this.publicBookingService.getPublicServices(tenantId);

    if (services.length === 0) {
      return { result: 'We currently have no services available for booking.' };
    }

    const serviceList = services
      .map((s) => `${s.name} (${s.durationMinutes} minutes, $${s.price || 'price varies'})`)
      .join(', ');

    return {
      result: `We offer the following services: ${serviceList}. Which service would you like to book?`,
      services: services,
    };
  }

  private async handleGetAvailableSlots(
    tenantId: string,
    params: { serviceId?: string; serviceName?: string; date?: string },
  ) {
    this.logger.log(`Getting available slots`, params);

    // Find service by ID or name
    const service = await this.prisma.withTenantContext(tenantId, async () => {
      if (params.serviceId) {
        return this.prisma.service.findFirst({
          where: { id: params.serviceId, tenantId },
        });
      }

      if (params.serviceName) {
        return this.prisma.service.findFirst({
          where: {
            tenantId,
            isActive: true,
            name: { contains: params.serviceName, mode: 'insensitive' },
          },
        });
      }

      return null;
    });

    if (!service) {
      return { result: 'I could not find that service. What service are you looking for?' };
    }

    // Parse date or default to tomorrow
    const targetDate = this.parseDate(params.date) || this.getNextBusinessDay();

    const slots = await this.publicBookingService.getAvailableTimeSlots(
      tenantId,
      service.id,
      targetDate,
    );
    const availableSlots = slots.filter((slot) => slot.available);

    if (availableSlots.length === 0) {
      return {
        result: `Sorry, we're fully booked for ${service.name} on ${this.formatDate(targetDate)}. Would you like to try another day?`,
      };
    }

    const formattedSlots = availableSlots.map((slot) => ({
      time: slot.time,
      display: this.formatTimeLabel(slot.time),
      datetime: this.combineDateAndTime(targetDate, slot.time),
    }));

    const slotList = formattedSlots.slice(0, 5).map((s) => s.display).join(', ');
    return {
      result: `Available times for ${service.name} on ${this.formatDate(targetDate)}: ${slotList}. Which time works for you?`,
      slots: formattedSlots,
      service: service,
      date: targetDate.toISOString().split('T')[0],
    };
  }

  private async handleBookAppointment(
    tenantId: string,
    callerPhone: string,
    params: { serviceName?: string; serviceId?: string; date?: string; time?: string; customerName?: string },
  ) {
    this.logger.log('Booking appointment', params);

    if (!callerPhone) {
      return { result: 'I need your phone number to complete the booking. Can you provide it?' };
    }

    if (!params.customerName) {
      return { result: 'May I have your name for the booking?' };
    }

    const service = await this.prisma.withTenantContext(tenantId, async () => {
      if (params.serviceId) {
        return this.prisma.service.findFirst({ where: { id: params.serviceId, tenantId } });
      }

      if (params.serviceName) {
        return this.prisma.service.findFirst({
          where: {
            tenantId,
            isActive: true,
            name: { contains: params.serviceName, mode: 'insensitive' },
          },
        });
      }

      return null;
    });

    if (!service) {
      return { result: 'Which service would you like to book?' };
    }

    // Parse date and time
    if (!params.date || !params.time) {
      return { result: 'What date and time would you like to book?' };
    }

    const scheduledAt = this.parseDateTime(params.date, params.time);
    if (!scheduledAt || scheduledAt < new Date()) {
      return { result: 'That time is not available. Please choose a future date and time.' };
    }

    try {
      const { appointment } = await this.publicBookingService.createBookingInternal(tenantId, {
        serviceId: service.id,
        scheduledAt,
        customer: {
          name: params.customerName,
          phone: callerPhone,
        },
        appointmentNotes: 'Booked via AI phone assistant',
      });

      this.logger.log(
        `Created appointment: ${appointment.id}, confirmation: ${appointment.confirmationCode}`,
      );

      const formattedDate = this.formatDate(appointment.scheduledAt);
      const formattedTime = appointment.scheduledAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      const serviceName = appointment.service?.name || service.name;

      return {
        result: `I've booked your ${serviceName} appointment for ${formattedDate} at ${formattedTime}. Your confirmation code is ${appointment.confirmationCode}. We'll send you a reminder before your appointment. Is there anything else I can help you with?`,
        appointment: {
          id: appointment.id,
          confirmationCode: appointment.confirmationCode,
          service: serviceName,
          date: formattedDate,
          time: formattedTime,
        },
      };
    } catch (error) {
      return { result: this.formatBookingError(error) };
    }
  }

  private async handleGetBusinessInfo(tenantId: string) {
    this.logger.log(`Getting business info for tenant: ${tenantId}`);

    return this.prisma.withTenantContext(tenantId, async () => {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return { result: 'Business information is not available.' };
      }

      return {
        result: `You've reached ${tenant.name}. Our phone number is ${tenant.phone || 'not available'}. How can I assist you today?`,
        business: {
          name: tenant.name,
          phone: tenant.phone,
          email: tenant.email,
        },
      };
    });
  }

  private async handleTransferToHuman(params: any, callData: any) {
    this.logger.log('Transferring to human', params);
    return {
      result: 'Let me transfer you to a team member who can help you further. Please hold.',
      transfer: true,
    };
  }

  // Helper methods
  private getNextBusinessDay(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  private parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;

    const today = new Date();
    today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

    const lower = dateStr.toLowerCase();
    if (lower === 'today') {
      return today;
    }
    if (lower === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    // Try parsing as a date string
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatTimeLabel(time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    const timeValue = new Date();
    timeValue.setHours(hour, minute, 0, 0);
    return timeValue.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private combineDateAndTime(date: Date, time: string): Date {
    const [hour, minute] = time.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hour, minute, 0, 0);
    return dateTime;
  }

  private formatBookingError(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String((error as { message?: string }).message || '');
      if (message) {
        return message;
      }
    }
    return 'Sorry, something went wrong while booking. Please try another time.';
  }

  private parseDateTime(dateStr: string, timeStr: string): Date | null {
    try {
      // Handle various date formats
      let date: Date;
      const today = new Date();

      if (dateStr.toLowerCase() === 'today') {
        date = today;
      } else if (dateStr.toLowerCase() === 'tomorrow') {
        date = new Date(today);
        date.setDate(date.getDate() + 1);
      } else {
        date = new Date(dateStr);
      }

      // Parse time (e.g., "2pm", "14:00", "2:30 PM")
      const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!timeMatch) return null;

      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch {
      return null;
    }
  }

  /**
   * Get the function definitions to pass to Vapi when creating an assistant
   */
  getBookingFunctionDefinitions() {
    return [
      {
        name: 'getServices',
        description: 'Get the list of available services that can be booked',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'getAvailableSlots',
        description: 'Get available appointment time slots for a specific service and date',
        parameters: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'The name of the service to check availability for',
            },
            date: {
              type: 'string',
              description: 'The date to check availability (YYYY-MM-DD format, or "today", "tomorrow")',
            },
          },
          required: ['serviceName'],
        },
      },
      {
        name: 'bookAppointment',
        description: 'Book an appointment for a customer. Requires customer name, service, date and time.',
        parameters: {
          type: 'object',
          properties: {
            customerName: {
              type: 'string',
              description: 'The full name of the customer',
            },
            serviceName: {
              type: 'string',
              description: 'The name of the service to book',
            },
            date: {
              type: 'string',
              description: 'The appointment date (YYYY-MM-DD format, or "today", "tomorrow")',
            },
            time: {
              type: 'string',
              description: 'The appointment time (e.g., "2pm", "14:00", "2:30 PM")',
            },
          },
          required: ['customerName', 'serviceName', 'date', 'time'],
        },
      },
      {
        name: 'getBusinessInfo',
        description: 'Get information about the business',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'transferToHuman',
        description: 'Transfer the call to a human representative when the AI cannot help',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'The reason for transferring',
            },
          },
        },
      },
    ];
  }
}
