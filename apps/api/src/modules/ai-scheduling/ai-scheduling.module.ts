import { Module, forwardRef } from '@nestjs/common';
import { AiSchedulingController } from './ai-scheduling.controller';
import { PreferenceLearningService } from './preference-learning.service';
import { RouteOptimizationService } from './route-optimization.service';
import { SmartDispatchService } from './smart-dispatch.service';
import { DispatchIntelligenceService } from './dispatch-intelligence.service';
import { TeamModule } from '../team/team.module';
import { AiEngineModule } from '../ai-engine/ai-engine.module';

@Module({
  imports: [forwardRef(() => TeamModule), AiEngineModule],
  controllers: [AiSchedulingController],
  providers: [
    PreferenceLearningService,
    RouteOptimizationService,
    SmartDispatchService,
    DispatchIntelligenceService,
  ],
  exports: [
    PreferenceLearningService,
    RouteOptimizationService,
    SmartDispatchService,
    DispatchIntelligenceService,
  ],
})
export class AiSchedulingModule {}
