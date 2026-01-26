import { Module } from '@nestjs/common';
import { PredictiveMaintenanceController } from './predictive-maintenance.controller';
import { EquipmentService } from './equipment.service';
import { PredictionService } from './prediction.service';
import { AlertService } from './alert.service';
import { EventsModule } from '../../config/events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [PredictiveMaintenanceController],
  providers: [EquipmentService, PredictionService, AlertService],
  exports: [EquipmentService, PredictionService, AlertService],
})
export class PredictiveMaintenanceModule {}
