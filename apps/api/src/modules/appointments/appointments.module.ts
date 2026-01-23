import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsValidatorsService } from './appointments-validators.service';
import { AppointmentsSlotsService } from './appointments-slots.service';

@Module({
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    AppointmentsValidatorsService,
    AppointmentsSlotsService,
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
