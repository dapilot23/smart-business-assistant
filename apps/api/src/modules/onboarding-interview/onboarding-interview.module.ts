import { Module } from '@nestjs/common';
import { OnboardingInterviewController } from './onboarding-interview.controller';
import { OnboardingInterviewService } from './onboarding-interview.service';
import { InterviewFlowService } from './interview-flow.service';
import { AiEngineModule } from '../ai-engine/ai-engine.module';

@Module({
  imports: [AiEngineModule],
  controllers: [OnboardingInterviewController],
  providers: [OnboardingInterviewService, InterviewFlowService],
  exports: [OnboardingInterviewService],
})
export class OnboardingInterviewModule {}
