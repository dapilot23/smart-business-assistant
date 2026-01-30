import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AiActionsController } from './ai-actions.controller';
import { ActionExecutorService } from './action-executor.service';
import { ActionProcessor } from './action.processor';
import { MarketingModule } from '../marketing/marketing.module';
import { SmsModule } from '../sms/sms.module';
import { EmailModule } from '../email/email.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { QuotesModule } from '../quotes/quotes.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'ai-actions',
    }),
    MarketingModule,
    SmsModule,
    EmailModule,
    AppointmentsModule,
    QuotesModule,
  ],
  controllers: [AiActionsController],
  providers: [ActionExecutorService, ActionProcessor],
  exports: [ActionExecutorService],
})
export class AiActionsModule {}
