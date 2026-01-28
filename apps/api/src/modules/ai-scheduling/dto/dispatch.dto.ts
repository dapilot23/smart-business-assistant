import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class FindBestTechnicianDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class FillGapDto {
  @IsString()
  @IsNotEmpty()
  technicianId: string;

  @IsDateString()
  date: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
