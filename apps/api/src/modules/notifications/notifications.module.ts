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
import { PublicCommunicationsController } from './public-communications.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    PrismaModule,
    SmsModule,
    EmailModule,
  ],
  controllers: [PublicCommunicationsController],
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
