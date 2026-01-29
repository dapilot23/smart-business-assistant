import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AiEngineModule } from '../ai-engine/ai-engine.module';
import { AgentInsightsService } from './agent-insights.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import {
  AgentInsightsController,
  AgentController,
} from './agent-insights.controller';
import { AgentProcessor } from './processors/agent.processor';
import { AgentEventHandler } from './handlers/agent-event.handler';

@Module({
  imports: [
    PrismaModule,
    AiEngineModule,
    BullModule.registerQueue({
      name: 'specialist-agents',
    }),
  ],
  controllers: [AgentInsightsController, AgentController],
  providers: [
    AgentInsightsService,
    AgentOrchestratorService,
    AgentProcessor,
    AgentEventHandler,
  ],
  exports: [AgentInsightsService, AgentOrchestratorService],
})
export class SpecialistAgentsModule {}
