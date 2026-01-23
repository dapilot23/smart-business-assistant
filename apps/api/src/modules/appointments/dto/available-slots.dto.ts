import { IsDateString, IsString, IsOptional } from 'class-validator';

export class AvailableSlotsDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;
}
