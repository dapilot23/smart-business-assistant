import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const NOTIFICATION_QUEUE = 'notifications';

export interface NotificationJob {
  type: 'sms' | 'email';
  to: string;
  message: string;
  subject?: string;
  template?: string;
  data?: Record<string, unknown>;
  tenantId: string;
  correlationId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {}

  async queueSms(
    to: string,
    message: string,
    tenantId: string,
    correlationId?: string,
  ): Promise<void> {
    const job: NotificationJob = {
      type: 'sms',
      to,
      message,
      tenantId,
      correlationId,
    };

    await this.notificationQueue.add('send-sms', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.debug(`Queued SMS to ${to} [${correlationId}]`);
  }

  async queueEmail(
    to: string,
    subject: string,
    template: string,
    data: Record<string, unknown>,
    tenantId: string,
    correlationId?: string,
  ): Promise<void> {
    const job: NotificationJob = {
      type: 'email',
      to,
      message: '',
      subject,
      template,
      data,
      tenantId,
      correlationId,
    };

    await this.notificationQueue.add('send-email', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.debug(`Queued email to ${to} [${correlationId}]`);
  }
}
