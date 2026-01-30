import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ReviewRequestStatus, JobStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReviewRequestsService {
  private readonly logger = new Logger(ReviewRequestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReviewRequest(tenantId: string, jobId: string) {
    const job = await this.validateJob(tenantId, jobId);

    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException('Job must be completed before requesting review');
    }

    const existingRequest = await this.prisma.reviewRequest.findUnique({
      where: { jobId },
    });

    if (existingRequest) {
      throw new BadRequestException('Review request already exists for this job');
    }

    const customerId = job.appointment.customerId;

    return this.prisma.reviewRequest.create({
      data: {
        tenantId,
        jobId,
        customerId,
        status: ReviewRequestStatus.PENDING,
      },
      include: {
        customer: true,
        job: {
          include: {
            appointment: true,
          },
        },
      },
    });
  }

  async getReviewRequests(tenantId: string) {
    return this.prisma.reviewRequest.findMany({
      where: { tenantId },
      include: {
        customer: true,
        job: {
          include: {
            appointment: {
              include: {
                service: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReviewStats(tenantId: string) {
    const stats = await this.prisma.reviewRequest.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });

    const total = await this.prisma.reviewRequest.count({ where: { tenantId } });
    const clicked = await this.prisma.reviewRequest.count({
      where: { tenantId, status: ReviewRequestStatus.CLICKED },
    });

    return {
      total,
      byStatus: stats.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      clickRate: total > 0 ? (clicked / total) * 100 : 0,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendPendingReviewRequests() {
    this.logger.log('Checking for pending review requests to send...');

    const settings = await this.prisma.withSystemContext(() =>
      this.prisma.tenantSettings.findMany({
        where: { reviewRequestEnabled: true },
      }),
    );

    for (const setting of settings) {
      await this.prisma.withTenantContext(setting.tenantId, () =>
        this.processTenantReviewRequests(
          setting.tenantId,
          setting.reviewRequestDelay,
        ),
      );
    }
  }

  async sendReviewRequest(tenantId: string, requestId: string) {
    const request = await this.validateReviewRequest(tenantId, requestId);

    await this.prisma.reviewRequest.update({
      where: { id: requestId },
      data: {
        status: ReviewRequestStatus.SENT,
        sentAt: new Date(),
      },
    });

    this.logger.log(`Review request sent: ${requestId}`);

    return { success: true, message: 'Review request sent' };
  }

  async trackClick(requestId: string, platform: 'google' | 'yelp') {
    return this.prisma.withSystemContext(async () => {
      const request = await this.prisma.reviewRequest.findUnique({
        where: { id: requestId },
        include: {
          tenant: {
            include: {
              settings: true,
            },
          },
        },
      });

      if (!request) {
        throw new NotFoundException('Review request not found');
      }

      await this.prisma.reviewRequest.update({
        where: { id: requestId },
        data: {
          status: ReviewRequestStatus.CLICKED,
          clickedAt: new Date(),
          platform,
        },
      });

      const reviewUrl = platform === 'google'
        ? request.tenant.settings?.googleReviewUrl
        : request.tenant.settings?.yelpReviewUrl;

      if (!reviewUrl) {
        throw new NotFoundException('Review URL not configured');
      }

      return { redirectUrl: reviewUrl };
    });
  }

  private async processTenantReviewRequests(tenantId: string, delayHours: number) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - delayHours);

    const pendingRequests = await this.prisma.reviewRequest.findMany({
      where: {
        tenantId,
        status: ReviewRequestStatus.PENDING,
        job: {
          completedAt: {
            lte: cutoffTime,
          },
        },
      },
      include: {
        customer: true,
      },
    });

    for (const request of pendingRequests) {
      try {
        await this.sendReviewRequest(tenantId, request.id);
        this.logger.log(`Sent review request for job ${request.jobId}`);
      } catch (error) {
        this.logger.error(`Failed to send review request ${request.id}:`, error);
      }
    }
  }

  private async validateJob(tenantId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        appointment: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return job;
  }

  private async validateReviewRequest(tenantId: string, requestId: string) {
    const request = await this.prisma.reviewRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Review request not found');
    }

    if (request.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return request;
  }
}
