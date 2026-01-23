import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum VapiWebhookEvent {
  ASSISTANT_REQUEST = 'assistant-request',
  STATUS_UPDATE = 'status-update',
  TRANSCRIPT = 'transcript',
  FUNCTION_CALL = 'function-call',
  END_OF_CALL = 'end-of-call-report',
}

export class WebhookPayloadDto {
  @IsEnum(VapiWebhookEvent)
  message: VapiWebhookEvent;

  @IsOptional()
  @IsObject()
  call?: any;

  @IsOptional()
  @IsString()
  transcript?: string;

  @IsOptional()
  @IsObject()
  functionCall?: any;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
