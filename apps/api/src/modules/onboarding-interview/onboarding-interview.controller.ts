import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res,
  Headers,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { OnboardingInterviewService } from './onboarding-interview.service';
import { ConversationLockService } from './conversation-lock.service';
import { VoiceInterviewService, VapiWebhookPayload } from './voice-interview.service';
import {
  CompleteInterviewDto,
  SendMessageDto,
  SkipQuestionDto,
  StartInterviewDto,
  UpdateProfileFieldDto,
  AcquireLockDto,
  ReleaseLockDto,
  StreamMessageDto,
  StartVoiceDto,
} from './dto/onboarding-interview.dto';

@Controller('onboarding-interview')
@UseGuards(ClerkAuthGuard)
export class OnboardingInterviewController {
  constructor(
    private readonly interviewService: OnboardingInterviewService,
    private readonly lockService: ConversationLockService,
    private readonly voiceService: VoiceInterviewService,
    private readonly configService: ConfigService,
  ) {}

  private validateVapiWebhook(vapiSecret?: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const expectedSecret = this.configService.get('VAPI_WEBHOOK_SECRET');

    if (isProduction && expectedSecret) {
      if (!vapiSecret || vapiSecret !== expectedSecret) {
        throw new UnauthorizedException('Invalid Vapi webhook secret');
      }
    }
  }

  /**
   * Get tenant ID from request, with demo mode fallback
   */
  private async getTenantId(req: { tenantId?: string }): Promise<string> {
    if (req.tenantId) {
      return req.tenantId;
    }

    const isDemoMode = this.configService.get('DEMO_MODE') === 'true';
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    if (isDemoMode && !isProduction) {
      const demoTenantId = await this.interviewService.getDemoTenantId();
      if (demoTenantId) {
        return demoTenantId;
      }
    }

    throw new BadRequestException(
      'Authentication required. Please sign in to continue.',
    );
  }

  @Public()
  @Get('status')
  async getStatus(@Req() req: { tenantId?: string }) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.getStatus(tenantId);
  }

  @Public()
  @Post('start')
  async startInterview(
    @Req() req: { tenantId?: string },
    @Body() dto: StartInterviewDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.startInterview(tenantId, dto.resume);
  }

  @Public()
  @Post('message')
  async sendMessage(
    @Req() req: { tenantId?: string },
    @Body() dto: SendMessageDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.processMessage(
      tenantId,
      dto.conversationId,
      dto.message,
    );
  }

  /**
   * Streaming message endpoint (SSE)
   * Returns real-time updates as the AI processes the response
   */
  @Public()
  @Post('message/stream')
  async sendMessageStream(
    @Req() req: { tenantId?: string },
    @Res() res: Response,
    @Body() dto: StreamMessageDto,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const tenantId = await this.getTenantId(req);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Helper to send SSE events
    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Acquire lock if session ID provided
      if (sessionId) {
        const lockResult = await this.lockService.acquireLock(
          dto.conversationId,
          sessionId,
        );
        if (!lockResult.success) {
          sendEvent('error', {
            code: 'LOCK_FAILED',
            message: lockResult.message || 'Failed to acquire conversation lock',
          });
          res.end();
          return;
        }
      }

      // Update state to processing
      await this.lockService.updateState(
        dto.conversationId,
        'PROCESSING' as any,
        sessionId,
      );

      sendEvent('state', { state: 'processing' });

      // Process the message
      const result = await this.interviewService.processMessageWithStream(
        tenantId,
        dto.conversationId,
        dto.message,
        // Stream callback for text chunks
        (chunk: string) => {
          sendEvent('text_delta', { content: chunk });
        },
        // Extraction callback for real-time field extractions
        (extraction: { field: string; value: unknown; confidence: number }) => {
          sendEvent('extraction', extraction);
        },
      );

      // Send completion event
      sendEvent('done', {
        progress: result.progress,
        nextQuestion: result.nextQuestion,
        isComplete: result.isComplete,
        inferredCount: result.inferredCount || 0,
      });

      // Release lock
      if (sessionId) {
        await this.lockService.releaseLock(dto.conversationId, sessionId);
      }
    } catch (error) {
      sendEvent('error', {
        code: 'PROCESSING_ERROR',
        message: error.message || 'Failed to process message',
      });

      // Update state to error
      await this.lockService.updateState(
        dto.conversationId,
        'ERROR' as any,
        sessionId,
      );
    } finally {
      res.end();
    }
  }

  @Public()
  @Post('skip')
  async skipQuestion(
    @Req() req: { tenantId?: string },
    @Body() dto: SkipQuestionDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.skipQuestion(tenantId, dto.conversationId);
  }

  @Public()
  @Post('complete')
  async completeInterview(
    @Req() req: { tenantId?: string },
    @Body() dto: CompleteInterviewDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.completeInterview(
      tenantId,
      dto.conversationId,
    );
  }

  @Public()
  @Get('summary')
  async getSummary(@Req() req: { tenantId?: string }) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.getSummary(tenantId);
  }

  @Public()
  @Get('conversation')
  async getConversation(@Req() req: { tenantId?: string }) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.getConversation(tenantId);
  }

  // ============================================
  // Lock Management Endpoints
  // ============================================

  @Public()
  @Post('lock/acquire')
  async acquireLock(
    @Req() req: { tenantId?: string },
    @Body() dto: AcquireLockDto,
  ) {
    await this.getTenantId(req); // Validate access
    const result = await this.lockService.acquireLock(
      dto.conversationId,
      dto.sessionId,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.reason,
        message: result.message,
        expiresIn: result.expiresIn,
      };
    }

    return { success: true };
  }

  @Public()
  @Post('lock/release')
  async releaseLock(
    @Req() req: { tenantId?: string },
    @Body() dto: ReleaseLockDto,
  ) {
    await this.getTenantId(req);
    const released = await this.lockService.releaseLock(
      dto.conversationId,
      dto.sessionId,
    );
    return { success: released };
  }

  @Public()
  @Post('lock/heartbeat')
  async heartbeat(
    @Req() req: { tenantId?: string },
    @Body() dto: ReleaseLockDto,
  ) {
    await this.getTenantId(req);
    const extended = await this.lockService.extendLock(
      dto.conversationId,
      dto.sessionId,
    );
    return { success: extended };
  }

  @Public()
  @Post('lock/takeover')
  async forceTakeover(
    @Req() req: { tenantId?: string },
    @Body() dto: AcquireLockDto,
  ) {
    await this.getTenantId(req);
    const result = await this.lockService.forceTakeover(
      dto.conversationId,
      dto.sessionId,
    );
    return { success: result.success };
  }

  // ============================================
  // Profile Management
  // ============================================

  @Put('profile')
  async updateProfileField(
    @Req() req: { tenantId: string },
    @Body() dto: UpdateProfileFieldDto,
  ) {
    const profile = await this.interviewService.getSummary(req.tenantId);
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }
    await this.interviewService.updateProfileField(
      req.tenantId,
      dto.field,
      dto.value,
    );
    return { success: true };
  }

  @Public()
  @Get('benchmarks')
  async getBenchmarks(@Req() req: { tenantId?: string }) {
    const tenantId = await this.getTenantId(req);
    return this.interviewService.getIndustryBenchmarks(tenantId);
  }

  // ============================================
  // Voice Interview Endpoints
  // ============================================

  @Public()
  @Post('voice/start')
  async startVoiceSession(
    @Req() req: { tenantId?: string },
    @Body() dto: StartVoiceDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.voiceService.startVoiceSession(tenantId, dto.conversationId, {
      mode: dto.mode,
      phoneNumber: dto.phoneNumber,
      voiceId: dto.voiceId,
    });
  }

  @Public()
  @Post('voice/webhook')
  async handleVapiWebhook(
    @Body() payload: VapiWebhookPayload,
    @Headers('x-vapi-secret') vapiSecret?: string,
  ) {
    this.validateVapiWebhook(vapiSecret);
    await this.voiceService.handleVapiWebhook(payload);
    return { received: true };
  }

  @Public()
  @Get('voice/status')
  async getVoiceStatus(
    @Req() req: { tenantId?: string },
    @Headers('x-session-id') sessionId: string,
  ) {
    const tenantId = await this.getTenantId(req);
    return this.voiceService.getVoiceStatus(tenantId, sessionId);
  }
}
