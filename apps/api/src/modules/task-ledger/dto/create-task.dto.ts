import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsObject,
  IsNumber,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  TaskLedgerType,
  TaskLedgerCategory,
} from '../types';

const toArray = (value: unknown): unknown[] | undefined => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const parts = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  }
  return value ? [value] : undefined;
};

export class CreateTaskDto {
  @IsEnum(TaskLedgerType)
  type: TaskLedgerType;

  @IsEnum(TaskLedgerCategory)
  category: TaskLedgerCategory;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  actionType?: string;

  @IsOptional()
  @IsString()
  actionEndpoint?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  undoWindowMins?: number;

  @IsOptional()
  @IsString()
  undoEndpoint?: string;

  @IsOptional()
  @IsObject()
  undoPayload?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiConfidence?: number;

  @IsOptional()
  @IsString()
  aiReasoning?: string;

  @IsOptional()
  @IsString()
  aiModel?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  traceId?: string;
}

export class DeclineTaskDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class GetTasksQueryDto {
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsEnum(TaskLedgerType, { each: true })
  types?: TaskLedgerType[];

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsEnum(TaskLedgerCategory, { each: true })
  categories?: TaskLedgerCategory[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priorityMin?: number;
}
