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
        return { assistant: { firstMessage: 'Hello! How can I help you?' } };
      default:
        return { received: true };
    }
  }
}
