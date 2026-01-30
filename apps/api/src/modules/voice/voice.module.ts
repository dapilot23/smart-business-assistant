import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { CustomerContextModule } from '../customer-context/customer-context.module';
import { PublicBookingModule } from '../public-booking/public-booking.module';

@Module({
  imports: [PrismaModule, CustomerContextModule, PublicBookingModule],
  controllers: [VoiceController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
