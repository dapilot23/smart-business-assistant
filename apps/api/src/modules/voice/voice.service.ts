import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VapiClient } from '@vapi-ai/server-sdk';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { OutboundCallDto } from './dto/outbound-call.dto';
import { CallStatus } from '@prisma/client';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private vapiClient: VapiClient | null = null;
  private readonly isConfigured: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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

  private ensureConfigured(): void {
    if (!this.isConfigured || !this.vapiClient) {
      throw new BadRequestException('Vapi.ai is not configured');
    }
  }

  async createAssistant(config: CreateAssistantDto) {
    this.ensureConfigured();

    const assistantConfig: any = {
      name: config.name,
      model: {
        provider: 'openai',
        model: config.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: config.systemPrompt || this.getDefaultSystemPrompt(),
          },
        ],
      },
      voice: {
        provider: 'azure',
        voiceId: config.voice || 'andrew',
      },
      firstMessage: config.firstMessage || 'Hello! How can I help you today?',
      transcriber: config.transcriber || {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
      },
      ...(config.functions && { functions: config.functions }),
    };

    const assistant = await this.vapiClient!.assistants.create(assistantConfig);
    this.logger.log(`Created assistant: ${(assistant as any).id}`);
    return assistant;
  }

  async makeOutboundCall(dto: OutboundCallDto, tenantId: string) {
    this.ensureConfigured();

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

    const call = await this.vapiClient!.calls.create(callConfig);
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
  }

  async handleIncomingCall(callData: any, tenantId: string) {
    this.logger.log(`Incoming call webhook: ${callData.id}`);

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
  }

  async handleCallStatusUpdate(callData: any) {
    this.logger.log(`Call status update: ${callData.id} - ${callData.status}`);

    await this.prisma.callLog.updateMany({
      where: { vapiCallId: callData.id },
      data: {
        status: this.mapVapiStatus(callData.status),
        metadata: callData,
      },
    });

    return { received: true };
  }

  async handleCallEnd(callData: any) {
    this.logger.log(`Call ended: ${callData.call?.id}`);

    const callId = callData.call?.id;
    if (!callId) {
      this.logger.warn('Call end event missing call ID');
      return { received: true };
    }

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
  }

  async handleFunctionCall(functionCallData: any) {
    this.logger.log(`Function call: ${functionCallData.functionCall?.name}`);

    const { name, parameters } = functionCallData.functionCall || {};

    switch (name) {
      case 'bookAppointment':
        return this.handleBookAppointment(parameters, functionCallData);
      case 'getBusinessInfo':
        return this.handleGetBusinessInfo(parameters, functionCallData);
      case 'transferToHuman':
        return this.handleTransferToHuman(parameters, functionCallData);
      default:
        this.logger.warn(`Unknown function: ${name}`);
        return { error: 'Unknown function' };
    }
  }

  async getCallLogs(tenantId: string, limit = 50) {
    return this.prisma.callLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
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
    return `You are a helpful AI assistant for a business. Your role is to:
1. Greet callers professionally
2. Help them book appointments
3. Provide business information
4. Transfer to a human when needed

Be friendly, concise, and professional. If you don't know something, offer to transfer to a human.`;
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

  private async handleBookAppointment(params: any, callData: any) {
    this.logger.log('Booking appointment', params);
    return {
      result: 'Appointment booking requested. A team member will confirm.',
    };
  }

  private async handleGetBusinessInfo(params: any, callData: any) {
    this.logger.log('Getting business info', params);
    return {
      result: 'We are open Monday-Friday 9am-5pm. Call us anytime for service!',
    };
  }

  private async handleTransferToHuman(params: any, callData: any) {
    this.logger.log('Transferring to human', params);
    return { result: 'Transferring you to a team member now...' };
  }
}
