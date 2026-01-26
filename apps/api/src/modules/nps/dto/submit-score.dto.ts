import { IsInt, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';

export class SubmitScoreDto {
  @IsInt()
  @Min(0, { message: 'Score must be at least 0' })
  @Max(10, { message: 'Score must be at most 10' })
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Feedback must not exceed 2000 characters' })
  feedback?: string;
}

export class RecordReviewClickDto {
  @IsString()
  @MaxLength(50, { message: 'Platform must not exceed 50 characters' })
  platform: string;
}
