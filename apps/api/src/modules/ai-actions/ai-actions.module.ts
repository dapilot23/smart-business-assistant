import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AiActionsController } from './ai-actions.controller';
import { ActionExecutorService } from './action-executor.service';
import { ActionProcessor } from './action.processor';
import { MarketingModule } from '../marketing/marketing.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'ai-actions',
    }),
    MarketingModule,
    SmsModule,
  ],
  controllers: [AiActionsController],
  providers: [ActionExecutorService, ActionProcessor],
  exports: [ActionExecutorService],
})
export class AiActionsModule {}
