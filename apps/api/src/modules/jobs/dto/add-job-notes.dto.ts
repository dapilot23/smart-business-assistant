import { IsString } from 'class-validator';

export class AddJobNotesDto {
  @IsString()
  notes: string;
}
