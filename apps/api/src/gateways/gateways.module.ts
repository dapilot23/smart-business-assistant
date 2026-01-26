import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { AiSchedulingModule } from '../modules/ai-scheduling/ai-scheduling.module';

@Module({
  imports: [AiSchedulingModule],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class GatewaysModule {}
