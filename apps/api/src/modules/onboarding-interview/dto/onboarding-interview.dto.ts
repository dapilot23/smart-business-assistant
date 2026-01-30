import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StartInterviewDto {
  @IsOptional()
  @IsBoolean()
  resume?: boolean;
}

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}

export class SkipQuestionDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;
}

export class CompleteInterviewDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;
}

export class UpdateProfileFieldDto {
  @IsNotEmpty()
  @IsString()
  field: string;

  @IsNotEmpty()
  value: unknown;
}

// Lock management DTOs
export class AcquireLockDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsString()
  sessionId: string;
}

export class ReleaseLockDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsString()
  sessionId: string;
}

// Streaming message DTO
export class StreamMessageDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}

// Voice interview DTOs
export class StartVoiceDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsString()
  mode: 'BROWSER_VOICE' | 'PHONE_CALL';

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  voiceId?: string;
}
