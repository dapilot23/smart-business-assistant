import { IsString, IsInt, Min, Max, IsBoolean, IsOptional, Matches } from 'class-validator';

export class CreateAvailabilityDto {
  @IsString()
  userId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format (e.g., 09:00)',
  })
  startTime: string;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format (e.g., 17:00)',
  })
  endTime: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
