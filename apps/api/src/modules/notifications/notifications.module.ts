import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  NotificationsService,
  NOTIFICATION_QUEUE,
} from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { AppointmentEventHandler } from './handlers/appointment.handler';
import { JobEventHandler } from './handlers/job.handler';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    SmsModule,
  ],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    AppointmentEventHandler,
    JobEventHandler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
