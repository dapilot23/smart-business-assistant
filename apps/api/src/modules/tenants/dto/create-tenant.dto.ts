import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
