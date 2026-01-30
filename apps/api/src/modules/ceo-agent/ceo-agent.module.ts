import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AgentTasksModule } from '../agent-tasks/agent-tasks.module';
import { CeoAgentController } from './ceo-agent.controller';
import { CeoAgentService } from './ceo-agent.service';

@Module({
  imports: [PrismaModule, AgentTasksModule],
  controllers: [CeoAgentController],
  providers: [CeoAgentService],
})
export class CeoAgentModule {}
