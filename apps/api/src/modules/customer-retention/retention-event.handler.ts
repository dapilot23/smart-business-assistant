import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, AppointmentEventPayload } from '../../config/events/events.types';
import { RetentionSequenceService } from './retention-sequence.service';

@Injectable()
export class RetentionEventHandler {
  private readonly logger = new Logger(RetentionEventHandler.name);

  constructor(private readonly retentionSequenceService: RetentionSequenceService) {}

  @OnEvent(EVENTS.APPOINTMENT_CREATED)
  async handleAppointmentCreated(payload: AppointmentEventPayload) {
    this.logger.log(
      `Cancelling retention sequence for customer ${payload.customerId} - new appointment booked`,
    );
    await this.retentionSequenceService.cancelSequence(
      payload.customerId,
      payload.tenantId,
    );
  }

  @OnEvent(EVENTS.APPOINTMENT_CONFIRMED)
  async handleAppointmentConfirmed(payload: AppointmentEventPayload) {
    this.logger.log(
      `Cancelling retention sequence for customer ${payload.customerId} - appointment confirmed`,
    );
    await this.retentionSequenceService.cancelSequence(
      payload.customerId,
      payload.tenantId,
    );
  }
}
