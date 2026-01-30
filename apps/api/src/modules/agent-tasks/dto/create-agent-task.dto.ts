import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsObject,
} from 'class-validator';
import { AgentType, TaskOwnerType, TaskPriority, TaskStatus, TaskSourceType } from '@prisma/client';

export class CreateAgentTaskDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskOwnerType)
  ownerType?: TaskOwnerType;

  @IsOptional()
  @IsEnum(AgentType)
  ownerAgentType?: AgentType;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  blockedReason?: string;

  @IsOptional()
  @IsEnum(TaskSourceType)
  sourceType?: TaskSourceType;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(TaskOwnerType)
  createdByType?: TaskOwnerType;

  @IsOptional()
  @IsEnum(AgentType)
  createdByAgentType?: AgentType;

  @IsOptional()
  @IsString()
  createdByUserId?: string;
}
