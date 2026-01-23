import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateTimeOffDto {
  @IsString()
  userId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
