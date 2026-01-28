import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateWaitlistDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  preferredStart?: string;

  @IsOptional()
  @IsString()
  preferredEnd?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
