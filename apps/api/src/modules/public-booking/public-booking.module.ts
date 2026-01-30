import { Module, forwardRef } from '@nestjs/common';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { CalendarModule } from '../calendar/calendar.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [PrismaModule, forwardRef(() => CalendarModule), SchedulingModule],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
  exports: [PublicBookingService],
})
export class PublicBookingModule {}
