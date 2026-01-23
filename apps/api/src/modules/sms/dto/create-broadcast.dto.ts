import { IsString, IsArray, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateBroadcastDto {
  @IsString()
  message: string;

  @IsArray()
  @IsEnum(UserRole, { each: true })
  @IsOptional()
  targetRoles?: UserRole[];
}
