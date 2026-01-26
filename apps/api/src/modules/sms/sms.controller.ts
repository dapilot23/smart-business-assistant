import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { validateRequest } from 'twilio';
import { Public } from '../../common/decorators/public.decorator';
import { SmsService } from './sms.service';
import { SendSmsDto, SendBulkSmsDto, TestSmsDto } from './dto/send-sms.dto';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';

@Controller('sms')
@UseGuards(ClerkAuthGuard)
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    return this.smsService.sendSms(sendSmsDto.to, sendSmsDto.message);
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  async sendBulkSms(@Body() sendBulkSmsDto: SendBulkSmsDto) {
    return this.smsService.sendBulkSms(
      sendBulkSmsDto.recipients,
      sendBulkSmsDto.message,
    );
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testSms(@Body() testSmsDto: TestSmsDto) {
    const message = testSmsDto.message ||
      'Test message from Smart Business Assistant. SMS is working correctly!';
    return this.smsService.sendSms(testSmsDto.to, message);
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus() {
    return {
      configured: this.smsService.isServiceConfigured(),
      message: this.smsService.isServiceConfigured()
        ? 'SMS service is configured and ready'
        : 'SMS service is not configured. Please set environment variables.',
    };
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Body() webhookData: any,
    @Headers('x-twilio-signature') twilioSignature?: string,
  ) {
    // Security: Validate Twilio webhook signature in production
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');

    if (isProduction && authToken) {
      if (!twilioSignature) {
        throw new UnauthorizedException('Missing Twilio signature');
      }

      const webhookUrl = `${this.configService.get('API_BASE_URL')}/api/v1/sms/webhook`;
      const isValid = validateRequest(authToken, twilioSignature, webhookUrl, webhookData);

      if (!isValid) {
        throw new UnauthorizedException('Invalid Twilio signature');
      }
    }

    return this.smsService.handleWebhook(webhookData);
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  async createBroadcast(@Req() req: any, @Body() dto: CreateBroadcastDto) {
    const tenantId = req.tenantId;
    const sentBy = req.userId;

    const broadcast = await this.smsService.createBroadcast(
      tenantId,
      dto.message,
      dto.targetRoles || [],
      sentBy,
    );

    const result = await this.smsService.sendBroadcast(broadcast.id);

    return result;
  }

  @Get('broadcasts')
  @HttpCode(HttpStatus.OK)
  async getBroadcasts(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.smsService.getBroadcasts(tenantId);
  }

  @Get('broadcasts/:id')
  @HttpCode(HttpStatus.OK)
  async getBroadcast(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.smsService.getBroadcast(tenantId, id);
  }
}
