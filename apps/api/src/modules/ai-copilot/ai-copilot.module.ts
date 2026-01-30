import { Module } from '@nestjs/common';
import { AiCopilotController } from './ai-copilot.controller';
import { AiCopilotService } from './ai-copilot.service';
import { CopilotToolsService } from './copilot-tools.service';
import { WeeklyReportService } from './weekly-report.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { AiEngineModule } from '../ai-engine/ai-engine.module';
import { AiActionsModule } from '../ai-actions/ai-actions.module';

@Module({
  imports: [AiEngineModule, AiActionsModule],
  controllers: [AiCopilotController],
  providers: [
    AiCopilotService,
    CopilotToolsService,
    WeeklyReportService,
    AnomalyDetectionService,
  ],
  exports: [
    AiCopilotService,
    CopilotToolsService,
    WeeklyReportService,
    AnomalyDetectionService,
  ],
})
export class AiCopilotModule {}
