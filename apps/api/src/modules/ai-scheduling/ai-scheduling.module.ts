import { Module } from '@nestjs/common';
import { AiSchedulingController } from './ai-scheduling.controller';
import { PreferenceLearningService } from './preference-learning.service';
import { RouteOptimizationService } from './route-optimization.service';

@Module({
  controllers: [AiSchedulingController],
  providers: [PreferenceLearningService, RouteOptimizationService],
  exports: [PreferenceLearningService, RouteOptimizationService],
})
export class AiSchedulingModule {}
