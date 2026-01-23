import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { VoiceService } from './voice.service';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { OutboundCallDto } from './dto/outbound-call.dto';
import { VapiWebhookEvent } from './dto/webhook-payload.dto';

@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

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
  async handleIncomingCall(@Body() webhookData: any) {
    const tenantId = webhookData.metadata?.tenantId || 'default';
    return this.voiceService.handleIncomingCall(webhookData, tenantId);
  }

  @Public()
  @Post('webhook/status')
  async handleStatusUpdate(@Body() webhookData: any) {
    return this.voiceService.handleCallStatusUpdate(webhookData);
  }

  @Public()
  @Post('webhook/transcript')
  async handleTranscript(@Body() webhookData: any) {
    return { received: true };
  }

  @Public()
  @Post('webhook/function-call')
  async handleFunctionCall(@Body() webhookData: any) {
    return this.voiceService.handleFunctionCall(webhookData);
  }

  @Public()
  @Post('webhook')
  async handleVapiWebhook(@Body() webhookData: any) {
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

    if (tenantId) {
      const config = this.voiceService.getAssistantConfig(tenantId);
      return { assistant: config };
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
              content: 'You are a helpful assistant. Ask how you can help and offer to transfer to a human if needed.',
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
