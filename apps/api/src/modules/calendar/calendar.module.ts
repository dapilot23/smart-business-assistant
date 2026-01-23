import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarQueueService } from './calendar-queue.service';
import { CalendarProcessor, CALENDAR_QUEUE } from './calendar.processor';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: CALENDAR_QUEUE,
    }),
  ],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarQueueService, CalendarProcessor],
  exports: [CalendarService, CalendarQueueService],
})
export class CalendarModule {}
