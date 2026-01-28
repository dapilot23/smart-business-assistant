import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TechnicianSkillsService } from './technician-skills.service';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [TeamController],
  providers: [TeamService, TechnicianSkillsService],
  exports: [TeamService, TechnicianSkillsService],
})
export class TeamModule {}
