import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../../config/events/events.module';
import {
  ReminderSchedulerService,
  APPOINTMENT_REMINDER_QUEUE,
} from './reminder-scheduler.service';
import { ReminderProcessor } from './reminder.processor';
import { NoshowPreventionService } from './noshow-prevention.service';
import { WaitlistService } from './waitlist.service';
import { NoshowEventHandler } from './noshow-event.handler';
import { NoshowPreventionController } from './noshow-prevention.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: APPOINTMENT_REMINDER_QUEUE }),
    PrismaModule,
    NotificationsModule,
    EventsModule,
  ],
  controllers: [NoshowPreventionController],
  providers: [
    NoshowPreventionService,
    ReminderSchedulerService,
    ReminderProcessor,
    WaitlistService,
    NoshowEventHandler,
  ],
  exports: [NoshowPreventionService, ReminderSchedulerService, WaitlistService],
})
export class NoshowPreventionModule {}
