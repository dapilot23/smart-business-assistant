import { Module } from '@nestjs/common';
import { AiCommunicationController } from './ai-communication.controller';
import { MessageClassificationService } from './message-classification.service';
import { ResponseGenerationService } from './response-generation.service';
import { ConversationSummaryService } from './conversation-summary.service';
import { AiEngineModule } from '../ai-engine/ai-engine.module';

@Module({
  imports: [AiEngineModule],
  controllers: [AiCommunicationController],
  providers: [
    MessageClassificationService,
    ResponseGenerationService,
    ConversationSummaryService,
  ],
  exports: [
    MessageClassificationService,
    ResponseGenerationService,
    ConversationSummaryService,
  ],
})
export class AiCommunicationModule {}
