import { IsEnum, IsOptional } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';

export class UpdateTeamMemberDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
