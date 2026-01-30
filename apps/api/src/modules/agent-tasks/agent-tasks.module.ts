import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AgentTasksController } from './agent-tasks.controller';
import { AgentTasksService } from './agent-tasks.service';

@Module({
  imports: [PrismaModule],
  controllers: [AgentTasksController],
  providers: [AgentTasksService],
  exports: [AgentTasksService],
})
export class AgentTasksModule {}
