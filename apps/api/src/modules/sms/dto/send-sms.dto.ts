import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class SendSmsDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class SendBulkSmsDto {
  @IsArray()
  @IsNotEmpty()
  recipients: string[];

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class TestSmsDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsOptional()
  message?: string;
}
