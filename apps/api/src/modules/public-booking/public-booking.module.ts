import { Module, forwardRef } from '@nestjs/common';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [PrismaModule, forwardRef(() => CalendarModule)],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
