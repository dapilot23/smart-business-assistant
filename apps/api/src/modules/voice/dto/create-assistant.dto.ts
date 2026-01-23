import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateAssistantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  firstMessage?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsObject()
  transcriber?: any;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  functions?: any[];
}
