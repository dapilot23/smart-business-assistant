import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { VoiceService } from './voice.service';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { OutboundCallDto } from './dto/outbound-call.dto';
import { VapiWebhookEvent } from './dto/webhook-payload.dto';

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate Vapi webhook secret
   */
  private validateVapiWebhook(vapiSecret?: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const expectedSecret = this.configService.get('VAPI_WEBHOOK_SECRET');

    if (isProduction && expectedSecret) {
      if (!vapiSecret || vapiSecret !== expectedSecret) {
        throw new UnauthorizedException('Invalid Vapi webhook secret');
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('assistant')
  async createAssistant(@Body() config: CreateAssistantDto) {
    return this.voiceService.createAssistant(config);
  }

  @UseGuards(JwtAuthGuard)
  @Post('call/outbound')
  async makeOutboundCall(@Request() req, @Body() callDto: OutboundCallDto) {
    const tenantId = req.user?.tenantId;
    return this.voiceService.makeOutboundCall(callDto, tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('calls')
  async getCallLogs(@Request() req, @Query('limit') limit?: number) {
    const tenantId = req.user?.tenantId;
    return this.voiceService.getCallLogs(tenantId, limit ? +limit : 50);
  }

  @Public()
  @Post('webhook/incoming')
  async handleIncomingCall(
    @Body() webhookData: any,
    @Headers('x-vapi-secret') vapiSecret?: string,
  ) {
    this.validateVapiWebhook(vapiSecret);
    const tenantId = webhookData.metadata?.tenantId || 'default';
    return this.voiceService.handleIncomingCall(webhookData, tenantId);
  }

  @Public()
  @Post('webhook/status')
  async handleStatusUpdate(
    @Body() webhookData: any,
    @Headers('x-vapi-secret') vapiSecret?: string,
  ) {
    this.validateVapiWebhook(vapiSecret);
    return this.voiceService.handleCallStatusUpdate(webhookData);
  }

  @Public()
  @Post('webhook/transcript')
  async handleTranscript(
    @Body() webhookData: any,
    @Headers('x-vapi-secret') vapiSecret?: string,
  ) {
    this.validateVapiWebhook(vapiSecret);
    return { received: true };
  }

  @Public()
  @Post('webhook/function-call')
  async handleFunctionCall(
    @Body() webhookData: any,
    @Headers('x-vapi-secret') vapiSecret?: string,
  ) {
    this.validateVapiWebhook(vapiSecret);
    return this.voiceService.handleFunctionCall(webhookData);
  }

  @Public()
  @Post('webhook')
  async handleVapiWebhook(
    @Body() webhookData: any,
    @Headers('x-vapi-secret') vapiSecret?: string,
  ) {
    this.validateVapiWebhook(vapiSecret);
    const { message } = webhookData;

    switch (message) {
      case VapiWebhookEvent.STATUS_UPDATE:
        return this.voiceService.handleCallStatusUpdate(webhookData.call);
      case VapiWebhookEvent.END_OF_CALL:
        return this.voiceService.handleCallEnd(webhookData);
      case VapiWebhookEvent.FUNCTION_CALL:
        return this.voiceService.handleFunctionCall(webhookData);
      case VapiWebhookEvent.ASSISTANT_REQUEST:
        return this.handleAssistantRequest(webhookData);
      default:
        return { received: true };
    }
  }

  private async handleAssistantRequest(webhookData: any) {
    // Get tenantId from the call metadata or phone number mapping
    const tenantId = webhookData.call?.metadata?.tenantId;
    // Get caller's phone number for context lookup
    const callerPhone = webhookData.call?.customer?.number;

    if (tenantId) {
      // Use the context-aware method for personalized interactions
      const { assistant, customerContext } =
        await this.voiceService.getAssistantConfigWithContext(tenantId, callerPhone);

      // Include customer context in the response for logging/debugging
      return {
        assistant,
        // Optionally include context for debugging (remove in production)
        ...(customerContext && {
          _context: {
            isReturningCustomer: customerContext.isReturningCustomer,
            totalVisits: customerContext.totalVisits,
          },
        }),
      };
    }

    // Default assistant if no tenant specified
    return {
      assistant: {
        firstMessage: 'Hello! How can I help you today?',
        model: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant. Ask how you can help and offer to transfer to a human if needed.',
            },
          ],
        },
        voice: {
          provider: 'azure',
          voiceId: 'andrew',
        },
      },
    };
  }
}
