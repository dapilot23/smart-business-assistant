import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../../config/events/events.module';
import { ReviewRequestsController } from './review-requests.controller';
import { ReviewRequestsService } from './review-requests.service';
import {
  SmartReviewService,
  REVIEW_PIPELINE_QUEUE,
} from './smart-review.service';
import { SmartReviewProcessor } from './smart-review.processor';
import { SmartReviewEventHandler } from './smart-review-event.handler';
import { ReputationAnalyticsService } from './reputation-analytics.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: REVIEW_PIPELINE_QUEUE }),
    PrismaModule,
    NotificationsModule,
    EventsModule,
  ],
  controllers: [ReviewRequestsController],
  providers: [
    ReviewRequestsService,
    SmartReviewService,
    SmartReviewProcessor,
    SmartReviewEventHandler,
    ReputationAnalyticsService,
  ],
  exports: [ReviewRequestsService, SmartReviewService],
})
export class ReviewRequestsModule {}
