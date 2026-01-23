import { IsEnum, IsString, IsOptional } from 'class-validator';
import { JobPhotoType } from '@prisma/client';

export class UploadPhotoDto {
  @IsEnum(JobPhotoType)
  type: JobPhotoType;

  @IsString()
  @IsOptional()
  caption?: string;
}
