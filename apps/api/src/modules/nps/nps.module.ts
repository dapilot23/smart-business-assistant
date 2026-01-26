import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NpsController } from './nps.controller';
import { NpsService, NPS_QUEUE } from './nps.service';
import { NpsProcessor } from './nps.processor';
import { SmsModule } from '../sms/sms.module';
import { EventsModule } from '../../config/events/events.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NPS_QUEUE,
    }),
    SmsModule,
    EventsModule,
  ],
  controllers: [NpsController],
  providers: [NpsService, NpsProcessor],
  exports: [NpsService],
})
export class NpsModule {}
