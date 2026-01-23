import { IsString } from 'class-validator';

export class CreateReviewRequestDto {
  @IsString()
  jobId: string;
}
