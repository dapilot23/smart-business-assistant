import { IsString, IsNotEmpty, IsEmail, ValidateNested, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePublicBookingDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customer: CustomerInfoDto;
}
