import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SmsService } from './sms.service';
import { SendSmsDto, SendBulkSmsDto, TestSmsDto } from './dto/send-sms.dto';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

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
  async handleWebhook(@Body() webhookData: any) {
    return this.smsService.handleWebhook(webhookData);
  }
}
