import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AgentType } from '@prisma/client';
import { AgentJobData } from '../processors/agent.processor';
import {
  QuoteEventPayload,
  AppointmentEventPayload,
  NpsEventPayload,
} from '../../../config/events/events.types';

@Injectable()
export class AgentEventHandler {
  private readonly logger = new Logger(AgentEventHandler.name);

  constructor(
    @InjectQueue('specialist-agents')
    private readonly agentQueue: Queue<AgentJobData>,
  ) {}

  @OnEvent('QUOTE_CREATED')
  async handleQuoteCreated(payload: QuoteEventPayload) {
    await this.scheduleAgent(
      payload.tenantId,
      AgentType.REVENUE_SALES,
      'QUOTE_CREATED',
      5000, // 5 second delay to let the quote data settle
    );
  }

  @OnEvent('QUOTE_SENT')
  async handleQuoteSent(payload: QuoteEventPayload) {
    await this.scheduleAgent(
      payload.tenantId,
      AgentType.REVENUE_SALES,
      'QUOTE_SENT',
      60000, // 1 minute delay
    );
  }

  @OnEvent('APPOINTMENT_CREATED')
  async handleAppointmentCreated(payload: AppointmentEventPayload) {
    await this.scheduleAgent(
      payload.tenantId,
      AgentType.OPERATIONS,
      'APPOINTMENT_CREATED',
      10000,
    );
  }

  @OnEvent('APPOINTMENT_CONFIRMED')
  async handleAppointmentConfirmed(payload: AppointmentEventPayload) {
    await this.scheduleAgent(
      payload.tenantId,
      AgentType.OPERATIONS,
      'APPOINTMENT_CONFIRMED',
      5000,
    );
  }

  @OnEvent('APPOINTMENT_CANCELLED')
  async handleAppointmentCancelled(payload: AppointmentEventPayload) {
    // Trigger customer success agent to assess churn risk
    await this.scheduleAgent(
      payload.tenantId,
      AgentType.CUSTOMER_SUCCESS,
      'APPOINTMENT_CANCELLED',
      30000, // 30 second delay
    );
  }

  @OnEvent('NPS_LOW_SCORE_ALERT')
  async handleLowNpsScore(payload: NpsEventPayload) {
    // Trigger customer success agent for low NPS scores
    await this.scheduleAgent(
      payload.tenantId,
      AgentType.CUSTOMER_SUCCESS,
      'NPS_LOW_SCORE_ALERT',
      60000,
    );
  }

  private async scheduleAgent(
    tenantId: string,
    agentType: AgentType,
    triggerEvent: string,
    delay: number,
  ): Promise<void> {
    const jobId = `${agentType}-${tenantId}-${triggerEvent}-${Date.now()}`;

    try {
      await this.agentQueue.add(
        'run-agent',
        {
          tenantId,
          agentType,
          triggeredBy: 'event',
          triggerEvent,
        },
        {
          jobId,
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      this.logger.log(
        `Scheduled ${agentType} agent for tenant ${tenantId} (trigger: ${triggerEvent})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule ${agentType} agent`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}
