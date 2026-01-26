import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, JobEventPayload } from '../../../config/events/events.types';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class JobEventHandler {
  private readonly logger = new Logger(JobEventHandler.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(EVENTS.JOB_STARTED)
  async handleJobStarted(payload: JobEventPayload) {
    this.logger.log(
      `Handling job started: ${payload.jobId} [${payload.correlationId}]`,
    );

    const { customerPhone, customerName, technicianName } = payload;
    const message = `Hi ${customerName}! ${technicianName || 'Our technician'} is on the way and will arrive shortly.`;

    await this.notifications.queueSms(
      customerPhone,
      message,
      payload.tenantId,
      payload.correlationId,
    );
  }

  @OnEvent(EVENTS.JOB_COMPLETED)
  async handleJobCompleted(payload: JobEventPayload) {
    this.logger.log(
      `Handling job completed: ${payload.jobId} [${payload.correlationId}]`,
    );

    const { customerPhone, customerName } = payload;
    const message = `Hi ${customerName}! Your service has been completed. Thank you for choosing us! We'd love to hear about your experience.`;

    await this.notifications.queueSms(
      customerPhone,
      message,
      payload.tenantId,
      payload.correlationId,
    );
  }
}
