import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';
import { CampaignsService } from './campaigns/campaigns.service';
import { CampaignsController } from './campaigns/campaigns.controller';
import { SegmentsService } from './segments/segments.service';
import { SegmentsController } from './segments/segments.controller';
import { SegmentRulesEngine } from './segments/segment-rules.engine';
import { ReferralsService } from './referrals/referrals.service';
import { ReferralsController } from './referrals/referrals.controller';
import { CampaignProcessor } from './processors/campaign.processor';

@Module({
  imports: [
    PrismaModule,
    SmsModule,
    BullModule.registerQueue({
      name: 'marketing-campaigns',
    }),
  ],
  controllers: [CampaignsController, SegmentsController, ReferralsController],
  providers: [
    CampaignsService,
    SegmentsService,
    SegmentRulesEngine,
    ReferralsService,
    CampaignProcessor,
  ],
  exports: [CampaignsService, SegmentsService, ReferralsService],
})
export class MarketingModule {}
