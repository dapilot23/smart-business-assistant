import { IsString, IsOptional } from 'class-validator';

export class CompleteJobDto {
  @IsString()
  @IsOptional()
  workSummary?: string;

  @IsString()
  @IsOptional()
  materialsUsed?: string;
}
