import { IsString, IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  customerId: string;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsDateString()
  scheduledAt: string;

  @IsInt()
  @Min(15)
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
