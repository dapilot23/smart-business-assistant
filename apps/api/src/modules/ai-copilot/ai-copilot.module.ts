import { Module } from '@nestjs/common';
import { AiCopilotController } from './ai-copilot.controller';
import { AiCopilotService } from './ai-copilot.service';
import { CopilotToolsService } from './copilot-tools.service';
import { WeeklyReportService } from './weekly-report.service';
import { AiEngineModule } from '../ai-engine/ai-engine.module';

@Module({
  imports: [AiEngineModule],
  controllers: [AiCopilotController],
  providers: [
    AiCopilotService,
    CopilotToolsService,
    WeeklyReportService,
  ],
  exports: [
    AiCopilotService,
    CopilotToolsService,
    WeeklyReportService,
  ],
})
export class AiCopilotModule {}
