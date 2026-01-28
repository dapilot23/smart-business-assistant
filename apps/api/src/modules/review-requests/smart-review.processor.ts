import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsService } from '../../config/events/events.service';
import {
  EVENTS,
  ReviewEventPayload,
} from '../../config/events/events.types';
import {
  REVIEW_PIPELINE_QUEUE,
  ReviewPipelineJob,
} from './smart-review.service';

@Processor(REVIEW_PIPELINE_QUEUE)
export class SmartReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(SmartReviewProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsService,
  ) {
    super();
  }

  async process(job: Job<ReviewPipelineJob>): Promise<void> {
    const { reviewRequestId, tenantId } = job.data;

    const request = await this.prisma.reviewRequest.findUnique({
      where: { id: reviewRequestId },
      include: { customer: true },
    });

    if (!request || request.status !== 'PENDING') {
      this.logger.log(`Review request ${reviewRequestId} skipped (not pending)`);
      return;
    }

    const message = this.buildReviewMessage(
      request.customer.name,
      job.data.platform,
      job.data.reviewUrl,
    );

    if (request.customer.phone) {
      await this.notifications.queueSms(
        request.customer.phone,
        message,
        tenantId,
      );
    }

    await this.prisma.reviewRequest.update({
      where: { id: reviewRequestId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    this.events.emit<ReviewEventPayload>(EVENTS.REVIEW_REQUEST_SENT, {
      tenantId,
      reviewRequestId,
      jobId: job.data.jobId,
      customerId: job.data.customerId,
      customerName: request.customer.name,
      customerPhone: request.customer.phone,
    });

    this.logger.log(
      `Review request sent: ${reviewRequestId} (${job.data.platform})`,
    );
  }

  private buildReviewMessage(
    customerName: string,
    platform: string,
    reviewUrl: string,
  ): string {
    return (
      `Hi ${customerName}! Thank you for the great rating. ` +
      `If you have 30 seconds, a ${platform} review would mean the world to us: ${reviewUrl}`
    );
  }
}
