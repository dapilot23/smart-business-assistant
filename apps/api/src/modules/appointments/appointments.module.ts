import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsValidatorsService } from './appointments-validators.service';
import { AppointmentsSlotsService } from './appointments-slots.service';
import { NoshowPreventionModule } from '../noshow-prevention/noshow-prevention.module';

@Module({
  imports: [NoshowPreventionModule],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    AppointmentsValidatorsService,
    AppointmentsSlotsService,
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
