import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ConversationState, Prisma } from '@prisma/client';
import { InterviewFlowService } from './interview-flow.service';

export interface VapiWebhookPayload {
  type: string;
  call?: {
    id: string;
    status: string;
    transcript?: string;
  };
  message?: {
    role: string;
    content: string;
  };
  metadata?: Record<string, unknown>;
}

export interface VoiceSessionOptions {
  mode: 'BROWSER_VOICE' | 'PHONE_CALL';
  phoneNumber?: string;
  voiceId?: string;
}

export interface VoiceSessionResponse {
  sessionId: string;
  mode: string;
  vapiConfig?: {
    assistantId: string;
    apiKey: string;
    callId?: string;
  };
  browserConfig?: {
    websocketUrl: string;
    token: string;
  };
}

export interface VoiceStatus {
  active: boolean;
  mode: string | null;
  callId: string | null;
  transcriptLength: number;
}

@Injectable()
export class VoiceInterviewService {
  private readonly logger = new Logger(VoiceInterviewService.name);
  private readonly vapiApiKey: string | undefined;
  private readonly vapiAssistantId: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly flowService: InterviewFlowService,
  ) {
    this.vapiApiKey = this.configService.get<string>('VAPI_API_KEY');
    this.vapiAssistantId = this.configService.get<string>('VAPI_ONBOARDING_ASSISTANT_ID');
  }

  /**
   * Start a voice interview session
   */
  async startVoiceSession(
    tenantId: string,
    conversationId: string,
    options: VoiceSessionOptions,
  ): Promise<VoiceSessionResponse> {
    if (!this.vapiApiKey) {
      throw new BadRequestException('Voice interviews are not configured');
    }

    const conversation = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
      include: { businessProfile: true },
    });

    if (!conversation || conversation.businessProfile.tenantId !== tenantId) {
      throw new BadRequestException('Conversation not found');
    }

    const sessionId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (options.mode === 'PHONE_CALL') {
      if (!options.phoneNumber) {
        throw new BadRequestException('Phone number required for phone call mode');
      }

      // Initiate outbound call via Vapi
      const callId = await this.initiateVapiCall(
        options.phoneNumber,
        conversationId,
        sessionId,
      );

      // Update conversation with call ID
      await this.prisma.onboardingConversation.update({
        where: { id: conversationId },
        data: {
          vapiCallId: callId,
          state: ConversationState.PROCESSING,
        },
      });

      return {
        sessionId,
        mode: 'PHONE_CALL',
        vapiConfig: {
          assistantId: this.vapiAssistantId || '',
          apiKey: this.vapiApiKey,
          callId,
        },
      };
    }

    // Browser voice mode - return config for WebRTC
    return {
      sessionId,
      mode: 'BROWSER_VOICE',
      vapiConfig: {
        assistantId: this.vapiAssistantId || '',
        apiKey: this.vapiApiKey,
      },
      browserConfig: {
        websocketUrl: `wss://api.vapi.ai/ws`,
        token: this.generateBrowserToken(conversationId, sessionId),
      },
    };
  }

  /**
   * Handle incoming Vapi webhook events
   */
  async handleVapiWebhook(payload: VapiWebhookPayload): Promise<void> {
    this.logger.debug('Received Vapi webhook', { type: payload.type });

    switch (payload.type) {
      case 'call-started':
        await this.handleCallStarted(payload);
        break;

      case 'call-ended':
        await this.handleCallEnded(payload);
        break;

      case 'transcript':
        await this.handleTranscript(payload);
        break;

      case 'function-call':
        await this.handleFunctionCall(payload);
        break;

      default:
        this.logger.debug(`Unhandled Vapi webhook type: ${payload.type}`);
    }
  }

  /**
   * Get voice session status
   */
  async getVoiceStatus(tenantId: string, sessionId: string): Promise<VoiceStatus> {
    // Find conversation by looking for matching vapiCallId or metadata
    const conversation = await this.prisma.onboardingConversation.findFirst({
      where: {
        businessProfile: { tenantId },
        vapiCallId: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      return {
        active: false,
        mode: null,
        callId: null,
        transcriptLength: 0,
      };
    }

    const transcript = conversation.voiceTranscript as unknown as Array<unknown>;

    return {
      active: conversation.state === ConversationState.PROCESSING,
      mode: conversation.vapiCallId ? 'PHONE_CALL' : 'BROWSER_VOICE',
      callId: conversation.vapiCallId,
      transcriptLength: transcript?.length || 0,
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async initiateVapiCall(
    phoneNumber: string,
    conversationId: string,
    sessionId: string,
  ): Promise<string> {
    // In production, this would call Vapi API to initiate outbound call
    // For now, return a mock call ID
    this.logger.log(`Initiating Vapi call to ${phoneNumber} for conversation ${conversationId}`);

    // Mock implementation - replace with actual Vapi API call
    const mockCallId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Real implementation would be:
    // const response = await fetch('https://api.vapi.ai/call', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.vapiApiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     assistantId: this.vapiAssistantId,
    //     phoneNumber,
    //     metadata: { conversationId, sessionId },
    //   }),
    // });
    // const data = await response.json();
    // return data.id;

    return mockCallId;
  }

  private generateBrowserToken(conversationId: string, sessionId: string): string {
    // Generate a short-lived token for browser WebRTC connection
    // In production, this would be a signed JWT
    const payload = {
      conversationId,
      sessionId,
      exp: Date.now() + 3600000, // 1 hour
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private async handleCallStarted(payload: VapiWebhookPayload): Promise<void> {
    if (!payload.call?.id) return;

    await this.prisma.onboardingConversation.updateMany({
      where: { vapiCallId: payload.call.id },
      data: {
        state: ConversationState.PROCESSING,
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(`Voice call started: ${payload.call.id}`);
  }

  private async handleCallEnded(payload: VapiWebhookPayload): Promise<void> {
    if (!payload.call?.id) return;

    const conversation = await this.prisma.onboardingConversation.findFirst({
      where: { vapiCallId: payload.call.id },
    });

    if (!conversation) return;

    // Store final transcript
    if (payload.call.transcript) {
      await this.prisma.onboardingConversation.update({
        where: { id: conversation.id },
        data: {
          voiceTranscript: payload.call.transcript as Prisma.InputJsonValue,
          state: ConversationState.IDLE,
          lastActivityAt: new Date(),
        },
      });
    }

    this.logger.log(`Voice call ended: ${payload.call.id}`);
  }

  private async handleTranscript(payload: VapiWebhookPayload): Promise<void> {
    if (!payload.call?.id || !payload.message) return;

    const conversation = await this.prisma.onboardingConversation.findFirst({
      where: { vapiCallId: payload.call.id },
    });

    if (!conversation) return;

    // Append to transcript
    const existingTranscript = (conversation.voiceTranscript as unknown as Array<unknown>) || [];
    existingTranscript.push({
      role: payload.message.role,
      content: payload.message.content,
      timestamp: new Date().toISOString(),
    });

    await this.prisma.onboardingConversation.update({
      where: { id: conversation.id },
      data: {
        voiceTranscript: existingTranscript as Prisma.InputJsonValue,
        lastActivityAt: new Date(),
      },
    });
  }

  private async handleFunctionCall(payload: VapiWebhookPayload): Promise<void> {
    // Handle Vapi function calls (e.g., "extract_business_info")
    // This would integrate with the inference engine
    this.logger.debug('Vapi function call received', { payload });
  }
}
