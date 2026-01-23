import { IsString, IsOptional, IsObject } from 'class-validator';

export class OutboundCallDto {
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  assistantId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
