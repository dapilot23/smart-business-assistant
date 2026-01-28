import { Module, Global } from '@nestjs/common';
import { AiEngineService } from './ai-engine.service';
import { AiCostTrackerService } from './ai-cost-tracker.service';
import { AiFeedbackService } from './ai-feedback.service';

@Global()
@Module({
  providers: [AiEngineService, AiCostTrackerService, AiFeedbackService],
  exports: [AiEngineService, AiCostTrackerService, AiFeedbackService],
})
export class AiEngineModule {}
