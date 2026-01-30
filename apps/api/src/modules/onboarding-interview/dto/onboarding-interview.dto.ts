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

export const ALLOWED_PROFILE_FIELDS = [
  'industry',
  'targetMarket',
  'serviceArea',
  'teamSize',
  'communicationStyle',
  'primaryGoals',
  'currentChallenges',
  'peakSeasons',
  'growthStage',
] as const;

export type ProfileField = (typeof ALLOWED_PROFILE_FIELDS)[number];

export class UpdateProfileFieldDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(ALLOWED_PROFILE_FIELDS)
  field: ProfileField;

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
