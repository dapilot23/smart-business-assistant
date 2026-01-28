import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENTS,
  PaymentEventPayload,
} from '../../config/events/events.types';
import { PaymentReminderService } from './payment-reminder.service';

@Injectable()
export class PaymentReminderEventHandler {
  private readonly logger = new Logger(PaymentReminderEventHandler.name);

  constructor(
    private readonly reminderService: PaymentReminderService,
  ) {}

  @OnEvent(EVENTS.PAYMENT_RECEIVED)
  async handlePaymentReceived(payload: PaymentEventPayload) {
    this.logger.log(
      `Cancelling reminders for paid invoice: ${payload.invoiceId} [${payload.correlationId}]`,
    );
    await this.reminderService.cancelReminders(payload.invoiceId);
  }
}
