import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AiEngineModule } from '../ai-engine/ai-engine.module';
import { AgentInsightsService } from './agent-insights.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import {
  AgentInsightsController,
  AgentController,
} from './agent-insights.controller';

@Module({
  imports: [PrismaModule, AiEngineModule],
  controllers: [AgentInsightsController, AgentController],
  providers: [AgentInsightsService, AgentOrchestratorService],
  exports: [AgentInsightsService, AgentOrchestratorService],
})
export class SpecialistAgentsModule {}
