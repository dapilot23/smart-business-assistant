import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export const REVIEW_PIPELINE_QUEUE = 'review-pipeline';

export interface ReviewPipelineJob {
  tenantId: string;
  reviewRequestId: string;
  customerId: string;
  jobId: string;
  platform: string;
  reviewUrl: string;
}

interface PlatformUrl {
  platform: string;
  url: string;
}

@Injectable()
export class SmartReviewService {
  private readonly logger = new Logger(SmartReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(REVIEW_PIPELINE_QUEUE) private readonly queue: Queue,
  ) {}

  async handleNpsScore(payload: {
    tenantId: string;
    surveyId: string;
    jobId: string;
    customerId: string;
    score: number;
    feedback?: string;
  }) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: payload.tenantId },
    });

    if (!settings?.reviewRequestEnabled) {
      this.logger.log(`Reviews disabled for tenant ${payload.tenantId}`);
      return;
    }

    if (payload.score >= 9) {
      await this.scheduleReviewRequest(
        payload.tenantId,
        payload.jobId,
        payload.customerId,
        payload.score,
        settings,
      );
    } else if (payload.score >= 7) {
      await this.sendPassiveFeedbackEmail(
        payload.tenantId,
        payload.customerId,
        payload.feedback,
      );
    }
    // Score <= 6: detractor — already handled by NPS low score alert
  }

  private async scheduleReviewRequest(
    tenantId: string,
    jobId: string,
    customerId: string,
    npsScore: number,
    settings: any,
  ) {
    const maxPerDay = settings.reviewMaxPerDay || 2;
    if (await this.isDailyLimitReached(tenantId, maxPerDay)) {
      this.logger.log(`Daily review limit reached for tenant ${tenantId}`);
      return;
    }

    const existing = await this.prisma.reviewRequest.findUnique({
      where: { jobId },
    });
    if (existing) {
      this.logger.log(`Review request already exists for job ${jobId}`);
      return;
    }

    const platformUrl = this.getPrimaryPlatformUrl(settings);
    if (!platformUrl) {
      this.logger.warn(`No review platform URL configured for ${tenantId}`);
      return;
    }

    const request = await this.prisma.reviewRequest.create({
      data: {
        tenantId,
        jobId,
        customerId,
        npsScore,
        npsGated: true,
        status: 'PENDING',
      },
    });

    const delay = this.calculateDelay(
      settings.reviewTimingHours || 3,
      settings.timezone || 'America/New_York',
    );

    const jobData: ReviewPipelineJob = {
      tenantId,
      reviewRequestId: request.id,
      customerId,
      jobId,
      platform: platformUrl.platform,
      reviewUrl: platformUrl.url,
    };

    await this.queue.add('send-review-request', jobData, {
      delay,
      jobId: `review-${request.id}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
    });

    this.logger.log(
      `Scheduled review request ${request.id} for job ${jobId} (${platformUrl.platform}, delay ${Math.round(delay / 60000)}min)`,
    );
  }

  private async sendPassiveFeedbackEmail(
    tenantId: string,
    customerId: string,
    feedback?: string,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer?.email) {
      this.logger.log(`No email for customer ${customerId}, skipping passive feedback`);
      return;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    await this.notifications.queueEmail(
      customer.email,
      `How can we improve? - ${tenant?.name || 'Our Team'}`,
      'passive-feedback',
      {
        customerName: customer.name,
        businessName: tenant?.name || 'Our Team',
        feedback: feedback || '',
      },
      tenantId,
    );

    this.logger.log(`Sent passive feedback email to customer ${customerId}`);
  }

  private async isDailyLimitReached(
    tenantId: string,
    maxPerDay: number,
  ): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const count = await this.prisma.reviewRequest.count({
      where: {
        tenantId,
        npsGated: true,
        createdAt: { gte: todayStart },
      },
    });

    return count >= maxPerDay;
  }

  calculateDelay(baseDelayHours: number, timezone: string): number {
    const now = new Date();
    const targetTime = new Date(
      now.getTime() + baseDelayHours * 60 * 60 * 1000,
    );

    if (this.isQuietHoursAt(targetTime, timezone)) {
      return this.getNextMorningDelay(now, timezone);
    }

    return baseDelayHours * 60 * 60 * 1000;
  }

  private isQuietHoursAt(date: Date, timezone: string): boolean {
    try {
      const hour = parseInt(
        date.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }),
        10,
      );
      return hour >= 20 || hour < 9;
    } catch {
      const hour = date.getUTCHours();
      return hour >= 20 || hour < 9;
    }
  }

  private getNextMorningDelay(now: Date, timezone: string): number {
    try {
      const tomorrow9am = new Date(now);
      tomorrow9am.setDate(tomorrow9am.getDate() + 1);
      const dateStr = tomorrow9am.toLocaleDateString('en-US', {
        timeZone: timezone,
      });
      const target = new Date(`${dateStr} 09:00:00`);
      return Math.max(target.getTime() - now.getTime(), 60000);
    } catch {
      return 12 * 60 * 60 * 1000; // fallback: 12 hours
    }
  }

  private getPrimaryPlatformUrl(settings: any): PlatformUrl | null {
    if (settings.googleReviewUrl) {
      return { platform: 'Google', url: settings.googleReviewUrl };
    }
    if (settings.yelpReviewUrl) {
      return { platform: 'Yelp', url: settings.yelpReviewUrl };
    }
    if (settings.facebookReviewUrl) {
      return { platform: 'Facebook', url: settings.facebookReviewUrl };
    }
    return null;
  }
}
