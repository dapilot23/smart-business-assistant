import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENTS,
  PaymentEventPayload,
} from '../../../config/events/events.types';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class PaymentEventHandler {
  private readonly logger = new Logger(PaymentEventHandler.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(EVENTS.PAYMENT_RECEIVED)
  async handlePaymentReceived(payload: PaymentEventPayload) {
    this.logger.log(
      `Handling payment received: ${payload.invoiceId} [${payload.correlationId}]`,
    );

    const { customerName, amount, currency } = payload;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'usd',
    }).format(amount);

    if (payload.customerPhone) {
      const message = `Hi ${customerName}! We've received your payment of ${formatted}. Thank you!`;

      await this.notifications.queueSms(
        payload.customerPhone,
        message,
        payload.tenantId,
        payload.correlationId,
      );
    }

    if (payload.customerEmail) {
      await this.notifications.queueEmail(
        payload.customerEmail,
        `Payment Received - ${formatted}`,
        'payment-receipt',
        {
          customerName,
          amount: formatted,
          invoiceId: payload.invoiceId,
        },
        payload.tenantId,
        payload.correlationId,
      );
    }
  }
}
