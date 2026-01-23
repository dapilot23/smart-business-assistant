import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateTenantWithOwnerDto {
  @IsString()
  tenantName: string;

  @IsString()
  tenantSlug: string;

  @IsEmail()
  tenantEmail: string;

  @IsString()
  @IsOptional()
  tenantPhone?: string;

  @IsString()
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  ownerClerkId: string;
}
