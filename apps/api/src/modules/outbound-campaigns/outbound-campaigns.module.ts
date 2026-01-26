import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutboundCampaignsController } from './outbound-campaigns.controller';
import {
  OutboundCampaignsService,
  OUTBOUND_CAMPAIGN_QUEUE,
} from './outbound-campaigns.service';
import { OutboundCampaignsProcessor } from './outbound-campaigns.processor';
import { VoiceModule } from '../voice/voice.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: OUTBOUND_CAMPAIGN_QUEUE,
    }),
    VoiceModule,
  ],
  controllers: [OutboundCampaignsController],
  providers: [OutboundCampaignsService, OutboundCampaignsProcessor],
  exports: [OutboundCampaignsService],
})
export class OutboundCampaignsModule {}
