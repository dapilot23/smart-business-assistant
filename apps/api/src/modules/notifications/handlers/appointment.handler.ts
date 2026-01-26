import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENTS,
  AppointmentEventPayload,
} from '../../../config/events/events.types';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class AppointmentEventHandler {
  private readonly logger = new Logger(AppointmentEventHandler.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(EVENTS.APPOINTMENT_CREATED)
  async handleAppointmentCreated(payload: AppointmentEventPayload) {
    this.logger.log(
      `Handling appointment created: ${payload.appointmentId} [${payload.correlationId}]`,
    );

    const { customerPhone, customerName, scheduledAt, serviceName } = payload;
    const formattedDate = new Date(scheduledAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = new Date(scheduledAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const message = `Hi ${customerName}! Your ${serviceName || 'appointment'} is confirmed for ${formattedDate} at ${formattedTime}. We look forward to seeing you!`;

    await this.notifications.queueSms(
      customerPhone,
      message,
      payload.tenantId,
      payload.correlationId,
    );
  }

  @OnEvent(EVENTS.APPOINTMENT_CONFIRMED)
  async handleAppointmentConfirmed(payload: AppointmentEventPayload) {
    this.logger.log(
      `Handling appointment confirmed: ${payload.appointmentId} [${payload.correlationId}]`,
    );

    const { customerPhone, customerName, scheduledAt, serviceName } = payload;
    const formattedDate = new Date(scheduledAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = new Date(scheduledAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const message = `Hi ${customerName}! Your ${serviceName || 'appointment'} for ${formattedDate} at ${formattedTime} has been confirmed.`;

    await this.notifications.queueSms(
      customerPhone,
      message,
      payload.tenantId,
      payload.correlationId,
    );
  }

  @OnEvent(EVENTS.APPOINTMENT_CANCELLED)
  async handleAppointmentCancelled(payload: AppointmentEventPayload) {
    this.logger.log(
      `Handling appointment cancelled: ${payload.appointmentId} [${payload.correlationId}]`,
    );

    const { customerPhone, customerName, scheduledAt, serviceName } = payload;
    const formattedDate = new Date(scheduledAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const message = `Hi ${customerName}, your ${serviceName || 'appointment'} scheduled for ${formattedDate} has been cancelled. Please contact us to reschedule.`;

    await this.notifications.queueSms(
      customerPhone,
      message,
      payload.tenantId,
      payload.correlationId,
    );
  }

  @OnEvent(EVENTS.APPOINTMENT_REMINDER_DUE)
  async handleAppointmentReminder(payload: AppointmentEventPayload) {
    this.logger.log(
      `Handling appointment reminder: ${payload.appointmentId} [${payload.correlationId}]`,
    );

    const { customerPhone, customerName, scheduledAt, serviceName } = payload;
    const formattedTime = new Date(scheduledAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const message = `Reminder: Hi ${customerName}, you have a ${serviceName || 'appointment'} scheduled for today at ${formattedTime}. See you soon!`;

    await this.notifications.queueSms(
      customerPhone,
      message,
      payload.tenantId,
      payload.correlationId,
    );
  }
}
