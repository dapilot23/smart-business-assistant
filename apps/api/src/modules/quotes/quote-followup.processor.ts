import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  QUOTE_FOLLOWUP_QUEUE,
  QuoteFollowUpJob,
  QuoteFollowupService,
} from './quote-followup.service';
import { toNum } from '../../common/utils/decimal';

@Processor(QUOTE_FOLLOWUP_QUEUE)
export class QuoteFollowupProcessor extends WorkerHost {
  private readonly logger = new Logger(QuoteFollowupProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly followupService: QuoteFollowupService,
  ) {
    super();
  }

  async process(job: Job<QuoteFollowUpJob>): Promise<void> {
    const { followUpId, tenantId } = job.data;

    await this.prisma.withTenantContext(tenantId, async () => {
      const followUp = await this.prisma.quoteFollowUp.findUnique({
        where: { id: followUpId },
      });

      if (!followUp || followUp.status !== 'PENDING') {
        this.logger.log(`Follow-up ${followUpId} skipped (not pending)`);
        return;
      }

      const quote = await this.prisma.quote.findUnique({
        where: { id: followUp.quoteId },
        include: { customer: true },
      });

      if (!quote || ['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(quote.status)) {
        this.logger.log(
          `Quote ${followUp.quoteId} no longer active, skipping follow-up`,
        );
        await this.markCancelled(followUpId);
        return;
      }

      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'usd',
      }).format(toNum(quote.amount));

      const { message, subject } = this.followupService.getFollowUpMessage(
        followUp.step,
        quote.customer.name,
        quote.description,
        formatted,
      );

      await this.sendFollowUp(
        followUp.channel,
        quote,
        message,
        subject,
        tenantId,
      );

      await this.prisma.quoteFollowUp.update({
        where: { id: followUpId },
        data: { status: 'SENT', sentAt: new Date() },
      });

      this.logger.log(
        `Follow-up step ${followUp.step} sent for quote ${quote.id}`,
      );
    });
  }

  private async sendFollowUp(
    channel: string,
    quote: any,
    message: string,
    subject: string,
    tenantId: string,
  ) {
    if (channel === 'SMS' && quote.customer.phone) {
      await this.notifications.queueSms(
        quote.customer.phone,
        message,
        tenantId,
      );
    } else if (channel === 'EMAIL' && quote.customer.email) {
      await this.notifications.queueEmail(
        quote.customer.email,
        subject,
        'quote-followup',
        {
          customerName: quote.customer.name,
          quoteNumber: quote.quoteNumber,
          amount: quote.amount,
          description: quote.description,
          message,
        },
        tenantId,
      );
    }
  }

  private async markCancelled(followUpId: string) {
    await this.prisma.quoteFollowUp.update({
      where: { id: followUpId },
      data: { status: 'CANCELLED' },
    });
  }
}
