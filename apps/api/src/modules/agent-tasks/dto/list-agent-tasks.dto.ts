import { IsEnum, IsOptional, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { AgentType, TaskOwnerType, TaskPriority, TaskStatus } from '@prisma/client';

export class ListAgentTasksDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

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
  @IsDateString()
  dueBefore?: string;

  @IsOptional()
  @IsDateString()
  dueAfter?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
