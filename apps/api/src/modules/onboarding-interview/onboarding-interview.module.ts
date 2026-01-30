import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OnboardingInterviewController } from './onboarding-interview.controller';
import { OnboardingInterviewService } from './onboarding-interview.service';
import { InterviewFlowService } from './interview-flow.service';
import { InferenceEngineService } from './inference-engine.service';
import { ExtractionProcessor, EXTRACTION_QUEUE } from './extraction.processor';
import { ConversationLockService } from './conversation-lock.service';
import { VoiceInterviewService } from './voice-interview.service';
import { AiEngineModule } from '../ai-engine/ai-engine.module';

@Module({
  imports: [
    AiEngineModule,
    BullModule.registerQueue({
      name: EXTRACTION_QUEUE,
    }),
  ],
  controllers: [OnboardingInterviewController],
  providers: [
    OnboardingInterviewService,
    InterviewFlowService,
    InferenceEngineService,
    ExtractionProcessor,
    ConversationLockService,
    VoiceInterviewService,
  ],
  exports: [OnboardingInterviewService],
})
export class OnboardingInterviewModule {}
