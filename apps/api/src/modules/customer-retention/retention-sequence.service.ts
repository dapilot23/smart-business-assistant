import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';

export const RETENTION_QUEUE = 'retention-campaigns';

export interface RetentionJob {
  tenantId: string;
  customerId: string;
  campaignId: string;
  step: number;
  channel: string;
  type: string;
}

interface SequenceStep {
  step: number;
  channel: 'SMS' | 'EMAIL' | 'BOTH';
  delayDays: number;
}

const SEQUENCE_STEPS: SequenceStep[] = [
  { step: 1, channel: 'SMS', delayDays: 0 },
  { step: 2, channel: 'EMAIL', delayDays: 7 },
  { step: 3, channel: 'SMS', delayDays: 14 },
];

@Injectable()
export class RetentionSequenceService {
  private readonly logger = new Logger(RetentionSequenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(RETENTION_QUEUE) private readonly queue: Queue,
  ) {}

  async createSequence(
    tenantId: string,
    customerId: string,
    type: string,
  ): Promise<void> {
    const now = new Date();
    const campaigns = await this.createCampaignRecords(
      tenantId,
      customerId,
      type,
      now,
    );

    await this.enqueueCampaignJobs(tenantId, customerId, type, campaigns, now);

    this.logger.log(
      `Created ${campaigns.length} retention campaigns for customer ${customerId}`,
    );
  }

  async cancelSequence(customerId: string): Promise<void> {
    const pending = await this.prisma.retentionCampaign.findMany({
      where: { customerId, status: 'PENDING' },
    });

    if (pending.length === 0) return;

    await this.prisma.retentionCampaign.updateMany({
      where: { customerId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    for (const campaign of pending) {
      try {
        const job = await this.queue.getJob(`retention-${campaign.id}`);
        if (job) await job.remove();
      } catch (error) {
        this.logger.warn(
          `Failed to remove job for campaign ${campaign.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Cancelled ${pending.length} campaigns for customer ${customerId}`,
    );
  }

  async getActiveCampaigns(tenantId: string): Promise<any[]> {
    return this.prisma.retentionCampaign.findMany({
      where: { tenantId, status: 'PENDING' },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  private async createCampaignRecords(
    tenantId: string,
    customerId: string,
    type: string,
    now: Date,
  ) {
    const records = SEQUENCE_STEPS.map((step) => {
      const scheduledAt = new Date(
        now.getTime() + step.delayDays * 24 * 60 * 60 * 1000,
      );
      return {
        tenantId,
        customerId,
        type,
        step: step.step,
        channel: step.channel,
        scheduledAt,
        status: 'PENDING',
      };
    });

    const created = await Promise.all(
      records.map((data) => this.prisma.retentionCampaign.create({ data })),
    );

    return created;
  }

  private async enqueueCampaignJobs(
    tenantId: string,
    customerId: string,
    type: string,
    campaigns: {
      id: string;
      step: number;
      channel: string;
      scheduledAt: Date;
    }[],
    now: Date,
  ) {
    for (const campaign of campaigns) {
      const delay = campaign.scheduledAt.getTime() - now.getTime();

      const jobData: RetentionJob = {
        tenantId,
        customerId,
        campaignId: campaign.id,
        step: campaign.step,
        channel: campaign.channel,
        type,
      };

      await this.queue.add('process-retention', jobData, {
        delay,
        jobId: `retention-${campaign.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      });
    }
  }
}
