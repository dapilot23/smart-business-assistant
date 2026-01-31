import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { AgentType, InsightPriority, InsightStatus } from '@prisma/client';

export enum AutopilotMode {
  SUGGEST = 'SUGGEST',
  DRAFT = 'DRAFT',
  AUTO = 'AUTO',
}

export class ListInsightsDto {
  @IsOptional()
  @IsEnum(AgentType)
  agentType?: AgentType;

  @IsOptional()
  @IsEnum(InsightPriority)
  priority?: InsightPriority;

  @IsOptional()
  @IsEnum(InsightStatus)
  status?: InsightStatus;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class UpdateInsightStatusDto {
  @IsEnum(InsightStatus)
  status: InsightStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class TriggerAgentDto {
  @IsOptional()
  @IsString()
  triggerEvent?: string;
}

export class UpdateAgentSettingsDto {
  @IsOptional()
  @IsEnum(AutopilotMode)
  autopilotMode?: AutopilotMode;

  @IsOptional()
  revenueAgentEnabled?: boolean;

  @IsOptional()
  customerAgentEnabled?: boolean;

  @IsOptional()
  operationsAgentEnabled?: boolean;

  @IsOptional()
  marketingAgentEnabled?: boolean;

  @IsOptional()
  dashboardNotifications?: boolean;

  @IsOptional()
  pushNotifications?: boolean;

  @IsOptional()
  @IsEnum(InsightPriority)
  pushMinPriority?: InsightPriority;

  @IsOptional()
  emailDigestEnabled?: boolean;

  @IsOptional()
  @IsString()
  emailDigestFrequency?: string;

  @IsOptional()
  @IsString({ each: true })
  emailDigestRecipients?: string[];
}
