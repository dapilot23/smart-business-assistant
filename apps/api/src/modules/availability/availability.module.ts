import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { TimeOffService } from './timeoff.service';
import { AvailabilityValidatorsService } from './availability-validators.service';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AvailabilityController],
  providers: [
    AvailabilityService,
    TimeOffService,
    AvailabilityValidatorsService,
  ],
  exports: [AvailabilityService, TimeOffService],
})
export class AvailabilityModule {}
