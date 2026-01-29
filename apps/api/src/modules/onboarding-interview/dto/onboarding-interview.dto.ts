import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
