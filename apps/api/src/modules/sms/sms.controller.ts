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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('sms')
@UseGuards(ClerkAuthGuard)
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async sendSms(@Req() req: any, @Body() sendSmsDto: SendSmsDto) {
    return this.smsService.sendSms(sendSmsDto.to, sendSmsDto.message, {
      tenantId: req.tenantId,
    });
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async sendBulkSms(@Req() req: any, @Body() sendBulkSmsDto: SendBulkSmsDto) {
    return this.smsService.sendBulkSms(
      sendBulkSmsDto.recipients,
      sendBulkSmsDto.message,
      req.tenantId,
    );
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async testSms(@Req() req: any, @Body() testSmsDto: TestSmsDto) {
    const message = testSmsDto.message ||
      'Test message from Smart Business Assistant. SMS is working correctly!';
    return this.smsService.sendSms(testSmsDto.to, message, {
      tenantId: req.tenantId,
    });
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
    // Security: Validate Twilio webhook signature in production or when explicitly required
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const enforceValidation = this.configService.get('TWILIO_WEBHOOK_VALIDATE') === 'true';
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');

    if ((isProduction || enforceValidation) && authToken) {
      if (!twilioSignature) {
        throw new UnauthorizedException('Missing Twilio signature');
      }

      const apiBaseUrl = this.configService.get('API_BASE_URL');
      const webhookUrl = apiBaseUrl
        ? `${apiBaseUrl}/api/v1/sms/webhook`
        : `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const isValid = validateRequest(authToken, twilioSignature, webhookUrl, webhookData);

      if (!isValid) {
        throw new UnauthorizedException('Invalid Twilio signature');
      }
    }

    return this.smsService.handleWebhook(webhookData);
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
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
