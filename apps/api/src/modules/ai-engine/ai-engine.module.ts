import { Module, Global } from '@nestjs/common';
import { AiEngineService } from './ai-engine.service';
import { AiCostTrackerService } from './ai-cost-tracker.service';
import { AiFeedbackService } from './ai-feedback.service';
import { AiFallbackService } from './ai-fallback.service';

@Global()
@Module({
  providers: [
    AiEngineService,
    AiCostTrackerService,
    AiFeedbackService,
    AiFallbackService,
  ],
  exports: [
    AiEngineService,
    AiCostTrackerService,
    AiFeedbackService,
    AiFallbackService,
  ],
})
export class AiEngineModule {}
