import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EVENTS, TaskActionEventPayload } from '../../config/events/events.types';
import { RetentionSequenceService } from '../customer-retention/retention-sequence.service';
import { CampaignsService } from '../marketing/campaigns/campaigns.service';
import {
  getCampaignIds,
  getCustomerIds,
  getPayloadNumber,
  getPayloadString,
  getPayloadValue,
} from './task-ledger-action.utils';

const DEFAULT_WINBACK_LIMIT = 10;

@Injectable()
export class TaskLedgerMarketingHandler {
  private readonly logger = new Logger(TaskLedgerMarketingHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retention: RetentionSequenceService,
    private readonly campaigns: CampaignsService,
  ) {}

  @OnEvent(EVENTS.WINBACK_REQUESTED)
  async handleWinback(payload: TaskActionEventPayload) {
    const scope = getPayloadValue(payload, 'scope');
    const limit = getPayloadNumber(payload, 'count', DEFAULT_WINBACK_LIMIT);
    const customerIds = getCustomerIds(payload);
    const ids = customerIds.length > 0
      ? customerIds
      : await this.fetchWinbackCustomers(payload.tenantId, scope, limit);

    if (ids.length === 0) {
      this.logger.warn('Winback requested without customer scope or customerId');
      return;
    }

    const type =
      getPayloadString(payload, 'type') ||
      (scope === 'at_risk_customers' || scope === 'at_risk'
        ? 'AT_RISK_WINBACK'
        : 'DORMANT_WINBACK');

    for (const customerId of ids) {
      await this.retention.createSequence(payload.tenantId, customerId, type);
    }
  }

  @OnEvent(EVENTS.CAMPAIGN_SEND_REQUESTED)
  async handleCampaignSend(payload: TaskActionEventPayload) {
    const campaignIds = getCampaignIds(payload);
    if (campaignIds.length === 0) {
      this.logger.warn('Campaign send requested without campaignId');
      return;
    }

    const scheduledAt = getPayloadString(payload, 'scheduledAt');
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

    for (const campaignId of campaignIds) {
      if (scheduledDate && !Number.isNaN(scheduledDate.getTime())) {
        await this.campaigns.schedule(payload.tenantId, campaignId, scheduledDate);
      } else {
        await this.campaigns.sendNow(payload.tenantId, campaignId);
      }
    }
  }

  private async fetchWinbackCustomers(
    tenantId: string,
    scope: unknown,
    limit: number,
  ): Promise<string[]> {
    if (scope !== 'dormant_customers' && scope !== 'dormant' &&
        scope !== 'at_risk_customers' && scope !== 'at_risk') {
      return [];
    }

    const lifecycleStage =
      scope === 'at_risk_customers' || scope === 'at_risk' ? 'AT_RISK' : 'DORMANT';

    const customers = await this.prisma.customer.findMany({
      where: { tenantId, lifecycleStage },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: { id: true },
    });

    return customers.map((customer) => customer.id);
  }
}
