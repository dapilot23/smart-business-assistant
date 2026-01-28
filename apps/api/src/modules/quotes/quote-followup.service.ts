import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export const QUOTE_FOLLOWUP_QUEUE = 'quote-followup';

export interface QuoteFollowUpJob {
  tenantId: string;
  quoteId: string;
  followUpId: string;
  step: number;
  channel: 'SMS' | 'EMAIL';
}

interface FollowUpStep {
  step: number;
  channel: 'SMS' | 'EMAIL';
  delayDays: number;
}

const FOLLOW_UP_STEPS: FollowUpStep[] = [
  { step: 1, channel: 'SMS', delayDays: 2 },
  { step: 2, channel: 'EMAIL', delayDays: 5 },
  { step: 3, channel: 'SMS', delayDays: 10 },
  { step: 4, channel: 'EMAIL', delayDays: 14 },
];

@Injectable()
export class QuoteFollowupService {
  private readonly logger = new Logger(QuoteFollowupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(QUOTE_FOLLOWUP_QUEUE) private readonly queue: Queue,
  ) {}

  async scheduleFollowUps(tenantId: string, quoteId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (settings && !settings.quoteFollowUpEnabled) {
      this.logger.log(`Follow-ups disabled for tenant ${tenantId}`);
      return;
    }

    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { customer: true },
    });

    if (!quote) {
      this.logger.warn(`Quote ${quoteId} not found for follow-up scheduling`);
      return;
    }

    const now = new Date();
    const followUps = await this.createFollowUpRecords(
      tenantId,
      quoteId,
      now,
    );

    await this.enqueueFollowUpJobs(tenantId, quoteId, followUps, now);

    this.logger.log(
      `Scheduled ${followUps.length} follow-ups for quote ${quoteId}`,
    );
  }

  async cancelFollowUps(quoteId: string) {
    const pending = await this.prisma.quoteFollowUp.findMany({
      where: { quoteId, status: 'PENDING' },
    });

    if (pending.length === 0) return;

    await this.prisma.quoteFollowUp.updateMany({
      where: { quoteId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    for (const followUp of pending) {
      try {
        const job = await this.queue.getJob(`followup-${followUp.id}`);
        if (job) await job.remove();
      } catch (error) {
        this.logger.warn(
          `Failed to remove job for follow-up ${followUp.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Cancelled ${pending.length} follow-ups for quote ${quoteId}`,
    );
  }

  getFollowUpMessage(
    step: number,
    customerName: string,
    serviceName: string,
    amount: string,
  ): { message: string; subject: string } {
    switch (step) {
      case 1:
        return {
          message: `Hi ${customerName}, just checking if you had any questions about your ${serviceName} quote for ${amount}. Happy to help!`,
          subject: '',
        };
      case 2:
        return {
          message: `Hi ${customerName}, we wanted to follow up on your ${serviceName} quote for ${amount}. We'd love to help you get started.`,
          subject: `Your Quote for ${serviceName}`,
        };
      case 3:
        return {
          message: `Hi ${customerName}, your quote for ${serviceName} (${amount}) expires in 5 days. Reply YES to book!`,
          subject: '',
        };
      case 4:
        return {
          message: `Hi ${customerName}, this is a final reminder about your ${serviceName} quote for ${amount}. We'd hate to see you miss out!`,
          subject: `Don't miss out - Your ${serviceName} Quote`,
        };
      default:
        return { message: '', subject: '' };
    }
  }

  private async createFollowUpRecords(
    tenantId: string,
    quoteId: string,
    baseTime: Date,
  ) {
    const records = FOLLOW_UP_STEPS.map((step) => ({
      tenantId,
      quoteId,
      step: step.step,
      channel: step.channel,
      scheduledAt: new Date(
        baseTime.getTime() + step.delayDays * 24 * 60 * 60 * 1000,
      ),
      status: 'PENDING',
    }));

    const created = await Promise.all(
      records.map((data) => this.prisma.quoteFollowUp.create({ data })),
    );

    return created;
  }

  private async enqueueFollowUpJobs(
    tenantId: string,
    quoteId: string,
    followUps: { id: string; step: number; channel: string; scheduledAt: Date }[],
    baseTime: Date,
  ) {
    for (const followUp of followUps) {
      const delay = followUp.scheduledAt.getTime() - baseTime.getTime();

      const jobData: QuoteFollowUpJob = {
        tenantId,
        quoteId,
        followUpId: followUp.id,
        step: followUp.step,
        channel: followUp.channel as 'SMS' | 'EMAIL',
      };

      await this.queue.add('process-followup', jobData, {
        delay,
        jobId: `followup-${followUp.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      });
    }
  }
}
