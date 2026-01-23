import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { JobStatus } from '@prisma/client';

export class JobFilterDto {
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @IsString()
  @IsOptional()
  technicianId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
