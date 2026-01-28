import { IsOptional, IsBoolean, IsInt, IsString, IsObject, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  businessHours?: Record<string, { start: string; end: string }>;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  appointmentReminders?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  reminderHoursBefore?: number;

  @IsOptional()
  @IsBoolean()
  autoConfirmBookings?: boolean;

  @IsOptional()
  @IsBoolean()
  reviewRequestEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  reviewRequestDelay?: number;

  @IsOptional()
  @IsString()
  googleReviewUrl?: string;

  @IsOptional()
  @IsString()
  yelpReviewUrl?: string;

  @IsOptional()
  @IsBoolean()
  depositRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  depositPercentage?: number;

  @IsOptional()
  @IsBoolean()
  lateFeeEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  lateFeePercentage?: number;

  @IsOptional()
  @IsBoolean()
  paymentReminderEnabled?: boolean;

  @IsOptional()
  @IsString()
  facebookReviewUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  reviewTimingHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reviewMaxPerDay?: number;
}
