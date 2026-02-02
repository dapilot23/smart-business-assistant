import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskLedgerController } from './task-ledger.controller';
import { TaskLedgerService } from './task-ledger.service';
import { TaskLedgerProcessor } from './task-ledger.processor';
import { TaskLedgerActionHandler } from './task-ledger-action.handler';
import { TaskLedgerEngagementHandler } from './task-ledger-engagement.handler';
import { TaskLedgerSchedulingHandler } from './task-ledger-scheduling.handler';
import { TaskLedgerMessagingHandler } from './task-ledger-messaging.handler';
import { TaskLedgerEmailHandler } from './task-ledger-email.handler';
import { TaskLedgerMarketingHandler } from './task-ledger-marketing.handler';
import { TaskLedgerOperationsHandler } from './task-ledger-operations.handler';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { EventsModule } from '../../config/events/events.module';
import { TASK_LEDGER_QUEUE } from './types';
import { PaymentReminderModule } from '../payment-reminders/payment-reminder.module';
import { QuotesModule } from '../quotes/quotes.module';
import { SmsModule } from '../sms/sms.module';
import { ReviewRequestsModule } from '../review-requests/review-requests.module';
import { NoshowPreventionModule } from '../noshow-prevention/noshow-prevention.module';
import { EmailModule } from '../email/email.module';
import { AiCommunicationModule } from '../ai-communication/ai-communication.module';
import { MessagingModule } from '../messaging/messaging.module';
import { CustomerRetentionModule } from '../customer-retention/customer-retention.module';
import { MarketingModule } from '../marketing/marketing.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    BullModule.registerQueue({ name: TASK_LEDGER_QUEUE }),
    PaymentReminderModule,
    QuotesModule,
    SmsModule,
    ReviewRequestsModule,
    NoshowPreventionModule,
    EmailModule,
    AiCommunicationModule,
    MessagingModule,
    CustomerRetentionModule,
    MarketingModule,
    AppointmentsModule,
    JobsModule,
  ],
  controllers: [TaskLedgerController],
  providers: [
    TaskLedgerService,
    TaskLedgerProcessor,
    TaskLedgerActionHandler,
    TaskLedgerEngagementHandler,
    TaskLedgerSchedulingHandler,
    TaskLedgerMessagingHandler,
    TaskLedgerEmailHandler,
    TaskLedgerMarketingHandler,
    TaskLedgerOperationsHandler,
  ],
  exports: [TaskLedgerService],
})
export class TaskLedgerModule {}
