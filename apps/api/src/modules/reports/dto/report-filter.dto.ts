import { IsOptional, IsIn } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsIn(['7d', '30d', '12m'])
  period?: string;
}
