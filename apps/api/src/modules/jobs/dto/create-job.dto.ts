import { IsString, IsOptional } from 'class-validator';

export class CreateJobDto {
  @IsString()
  appointmentId: string;

  @IsString()
  @IsOptional()
  technicianId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
