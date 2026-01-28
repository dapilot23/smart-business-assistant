import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsSchedulerService } from './sms-scheduler.service';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { EventsModule } from '../../config/events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [SmsController],
  providers: [SmsService, SmsSchedulerService],
  exports: [SmsService],
})
export class SmsModule {}
