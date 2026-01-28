import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateServiceIntervalDto {
  @IsString()
  serviceId: string;

  @IsInt()
  @Min(1)
  intervalDays: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  reminderDays?: number;
}
