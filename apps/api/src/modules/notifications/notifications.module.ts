import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  NotificationsService,
  NOTIFICATION_QUEUE,
} from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { AppointmentEventHandler } from './handlers/appointment.handler';
import { JobEventHandler } from './handlers/job.handler';
import { PaymentEventHandler } from './handlers/payment.handler';
import { SmsModule } from '../sms/sms.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    SmsModule,
    EmailModule,
  ],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    AppointmentEventHandler,
    JobEventHandler,
    PaymentEventHandler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
