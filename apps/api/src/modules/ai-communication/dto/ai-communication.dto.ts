import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { MessageIntent, MessageSentiment } from '@prisma/client';

export class ClassifyMessageDto {
  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  customerContext?: string;
}

export class GenerateResponsesDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  count?: number;
}

export class GenerateStoredSuggestionsDto {
  @IsString()
  @IsOptional()
  messageId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  count?: number;
}

export class AcceptSuggestionDto {
  @IsString()
  @IsOptional()
  editedText?: string;
}

export class CreateAutoResponderRuleDto {
  @IsString()
  name: string;

  @IsEnum(MessageIntent)
  @IsOptional()
  intent?: MessageIntent;

  @IsEnum(MessageSentiment)
  @IsOptional()
  sentiment?: MessageSentiment;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  minUrgency?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxUrgency?: number;

  @IsString()
  responseTemplate: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;
}

export class UpdateAutoResponderRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(MessageIntent)
  @IsOptional()
  intent?: MessageIntent;

  @IsEnum(MessageSentiment)
  @IsOptional()
  sentiment?: MessageSentiment;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  minUrgency?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxUrgency?: number;

  @IsString()
  @IsOptional()
  responseTemplate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;
}

export class SummarizeHandoffDto {
  @IsString()
  @IsOptional()
  nextAgentContext?: string;
}
