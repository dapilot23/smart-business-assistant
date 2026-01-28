import { IsArray, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SkillLevel } from '@prisma/client';

export class SkillInputDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsEnum(SkillLevel)
  level: SkillLevel;
}

export class SetSkillsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillInputDto)
  skills: SkillInputDto[];
}
