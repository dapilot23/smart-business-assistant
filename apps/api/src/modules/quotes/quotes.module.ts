import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { PdfService } from './pdf.service';
import { QuoteFollowupService, QUOTE_FOLLOWUP_QUEUE } from './quote-followup.service';
import { QuoteFollowupProcessor } from './quote-followup.processor';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../../config/events/events.module';

@Module({
  imports: [
    PrismaModule,
    SmsModule,
    NotificationsModule,
    EventsModule,
    BullModule.registerQueue({ name: QUOTE_FOLLOWUP_QUEUE }),
  ],
  controllers: [QuotesController],
  providers: [
    QuotesService,
    PdfService,
    QuoteFollowupService,
    QuoteFollowupProcessor,
  ],
  exports: [QuotesService, PdfService],
})
export class QuotesModule {}
