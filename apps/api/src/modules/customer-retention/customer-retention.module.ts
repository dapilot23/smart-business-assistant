import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../../config/events/events.module';
import {
  RetentionSequenceService,
  RETENTION_QUEUE,
} from './retention-sequence.service';
import { RetentionProcessor } from './retention.processor';
import { RetentionCronService } from './retention-cron.service';
import { RetentionAnalyticsService } from './retention-analytics.service';
import { RetentionIntelligenceService } from './retention-intelligence.service';
import { RetentionEventHandler } from './retention-event.handler';
import { CustomerRetentionController } from './customer-retention.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: RETENTION_QUEUE }),
    PrismaModule,
    NotificationsModule,
    EventsModule,
  ],
  controllers: [CustomerRetentionController],
  providers: [
    RetentionSequenceService,
    RetentionProcessor,
    RetentionCronService,
    RetentionAnalyticsService,
    RetentionIntelligenceService,
    RetentionEventHandler,
  ],
  exports: [
    RetentionSequenceService,
    RetentionAnalyticsService,
    RetentionIntelligenceService,
  ],
})
export class CustomerRetentionModule {}
