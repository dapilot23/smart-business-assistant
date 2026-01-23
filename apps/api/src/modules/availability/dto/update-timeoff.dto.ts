import { IsDateString, IsString, IsOptional } from 'class-validator';

export class UpdateTimeOffDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
