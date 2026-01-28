import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  PaymentReminderService,
  PAYMENT_REMINDER_QUEUE,
} from './payment-reminder.service';
import { PaymentReminderProcessor } from './payment-reminder.processor';
import { PaymentReminderEventHandler } from './payment-reminder.handler';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: PAYMENT_REMINDER_QUEUE }),
    PrismaModule,
    NotificationsModule,
  ],
  providers: [
    PaymentReminderService,
    PaymentReminderProcessor,
    PaymentReminderEventHandler,
  ],
  exports: [PaymentReminderService],
})
export class PaymentReminderModule {}
