import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { EventsService } from '../../config/events/events.service';
import { EVENTS, NpsEventPayload } from '../../config/events/events.types';

export const NPS_QUEUE = 'nps-surveys';

export interface SurveyResult {
  score: number;
  feedback?: string;
  category: 'promoter' | 'passive' | 'detractor';
  shouldPromptReview: boolean;
}

@Injectable()
export class NpsService {
  private readonly logger = new Logger(NpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly events: EventsService,
    @InjectQueue(NPS_QUEUE) private readonly npsQueue: Queue,
  ) {}

  /**
   * Schedule NPS survey for a completed job
   */
  async scheduleSurvey(
    tenantId: string,
    jobId: string,
    customerId: string,
    delayHours?: number,
  ): Promise<void> {
    // Get tenant settings for delay
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    const delay = (delayHours ?? settings?.reviewRequestDelay ?? 24) * 3600000;

    // Create survey record
    const token = randomBytes(16).toString('hex');

    await this.prisma.npsSurvey.create({
      data: {
        tenantId,
        jobId,
        customerId,
        token,
        status: 'PENDING',
      },
    });

    // Queue the survey to be sent
    await this.npsQueue.add(
      'send-survey',
      { surveyToken: token, tenantId },
      {
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );

    this.logger.log(`Scheduled NPS survey for job ${jobId} in ${delayHours ?? settings?.reviewRequestDelay ?? 24}h`);
  }

  /**
   * Send the NPS survey
   */
  async sendSurvey(token: string): Promise<void> {
    const survey = await this.prisma.npsSurvey.findUnique({
      where: { token },
      include: {
        job: {
          include: {
            appointment: {
              include: {
                customer: true,
                service: true,
              },
            },
          },
        },
      },
    });

    if (!survey || survey.status !== 'PENDING') {
      this.logger.warn(`Survey ${token} not found or already processed`);
      return;
    }

    const customer = survey.job?.appointment?.customer;
    if (!customer?.phone) {
      this.logger.warn(`No phone number for survey ${token}`);
      return;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: survey.tenantId },
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const surveyUrl = `${baseUrl}/survey/${token}`;
    const serviceName = survey.job?.appointment?.service?.name || 'your service';

    const message = `Hi ${customer.name}! Thank you for choosing ${tenant?.name}. ` +
      `How was ${serviceName}? Rate your experience: ${surveyUrl}`;

    try {
      await this.smsService.sendSms(customer.phone, message);

      await this.prisma.npsSurvey.update({
        where: { token },
        data: { status: 'SENT', sentAt: new Date() },
      });

      this.logger.log(`NPS survey sent to ${customer.phone}`);
    } catch (error) {
      this.logger.error(`Failed to send NPS survey: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit NPS score
   */
  async submitScore(
    token: string,
    score: number,
    feedback?: string,
  ): Promise<SurveyResult> {
    if (score < 0 || score > 10) {
      throw new Error('Score must be between 0 and 10');
    }

    const survey = await this.prisma.npsSurvey.findUnique({
      where: { token },
      include: {
        job: {
          include: {
            appointment: {
              include: { customer: true },
            },
          },
        },
      },
    });

    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    if (survey.status === 'RESPONDED' || survey.status === 'REVIEW_PROMPTED') {
      throw new Error('Survey already submitted');
    }

    // Categorize the score
    const category = this.categorizeScore(score);
    const shouldPromptReview = score >= 9;

    await this.prisma.npsSurvey.update({
      where: { token },
      data: {
        score,
        feedback,
        status: shouldPromptReview ? 'REVIEW_PROMPTED' : 'RESPONDED',
        respondedAt: new Date(),
      },
    });

    // Handle based on score
    if (score <= 6) {
      // Detractor: Alert manager
      await this.alertManager(survey.tenantId, survey.jobId, score, feedback);
    }

    this.events.emit<NpsEventPayload>(EVENTS.NPS_SCORE_SUBMITTED, {
      tenantId: survey.tenantId,
      surveyId: survey.id,
      jobId: survey.jobId,
      customerId: survey.customerId,
      score,
      feedback,
    });

    this.logger.log(`NPS score submitted: ${score} (${category})`);

    return {
      score,
      feedback,
      category,
      shouldPromptReview,
    };
  }

  /**
   * Record review click
   */
  async recordReviewClick(token: string, platform: string): Promise<void> {
    await this.prisma.npsSurvey.update({
      where: { token },
      data: {
        status: 'REVIEW_CLICKED',
        reviewClicked: true,
        reviewPlatform: platform,
      },
    });

    this.logger.log(`Review click recorded: ${platform}`);
  }

  /**
   * Get survey by token (for public page)
   */
  async getSurveyByToken(token: string) {
    const survey = await this.prisma.npsSurvey.findUnique({
      where: { token },
      include: {
        job: {
          include: {
            appointment: {
              include: {
                service: { select: { name: true } },
                customer: { select: { name: true } },
              },
            },
            technician: { select: { name: true } },
          },
        },
      },
    });

    if (!survey) {
      return null;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: survey.tenantId },
      include: { settings: true },
    });

    return {
      id: survey.id,
      status: survey.status,
      score: survey.score,
      businessName: tenant?.name,
      serviceName: survey.job?.appointment?.service?.name,
      technicianName: survey.job?.technician?.name,
      customerName: survey.job?.appointment?.customer?.name,
      reviewUrls: {
        google: tenant?.settings?.googleReviewUrl,
        yelp: tenant?.settings?.yelpReviewUrl,
      },
    };
  }

  /**
   * Get NPS analytics for tenant
   */
  async getAnalytics(tenantId: string, startDate?: Date, endDate?: Date) {
    const where = {
      tenantId,
      respondedAt: { not: null },
      ...(startDate && endDate && {
        respondedAt: { gte: startDate, lte: endDate },
      }),
    };

    const surveys = await this.prisma.npsSurvey.findMany({
      where,
      select: { score: true, respondedAt: true, reviewClicked: true },
    });

    const respondedSurveys = surveys.filter((s) => s.score !== null);
    const totalResponses = respondedSurveys.length;

    if (totalResponses === 0) {
      return {
        npsScore: null,
        totalResponses: 0,
        distribution: { promoters: 0, passives: 0, detractors: 0 },
        reviewClickRate: 0,
        trend: [],
      };
    }

    // Calculate NPS
    const promoters = respondedSurveys.filter((s) => s.score! >= 9).length;
    const detractors = respondedSurveys.filter((s) => s.score! <= 6).length;
    const passives = totalResponses - promoters - detractors;

    const promoterPercent = (promoters / totalResponses) * 100;
    const detractorPercent = (detractors / totalResponses) * 100;
    const npsScore = Math.round(promoterPercent - detractorPercent);

    // Review click rate
    const reviewClicks = surveys.filter((s) => s.reviewClicked).length;
    const reviewClickRate = (reviewClicks / totalResponses) * 100;

    // Monthly trend (last 6 months)
    const trend = await this.calculateMonthlyTrend(tenantId);

    return {
      npsScore,
      totalResponses,
      distribution: {
        promoters: Math.round(promoterPercent),
        passives: Math.round((passives / totalResponses) * 100),
        detractors: Math.round(detractorPercent),
      },
      reviewClickRate: Math.round(reviewClickRate),
      trend,
    };
  }

  /**
   * List surveys for a tenant
   */
  async listSurveys(tenantId: string, options?: { status?: string; limit?: number }) {
    return this.prisma.npsSurvey.findMany({
      where: {
        tenantId,
        ...(options?.status && { status: options.status as any }),
      },
      include: {
        job: {
          include: {
            appointment: {
              include: {
                customer: { select: { name: true, phone: true } },
                service: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  // Private helper methods

  private categorizeScore(score: number): 'promoter' | 'passive' | 'detractor' {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
  }

  private async alertManager(
    tenantId: string,
    jobId: string,
    score: number,
    feedback?: string,
  ): Promise<void> {
    // Find admin/owner users
    const admins = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ['OWNER', 'ADMIN'] },
        status: 'ACTIVE',
      },
      select: { id: true, email: true, phone: true },
    });

    // Emit event for notification handling
    this.events.emit<NpsEventPayload>(EVENTS.NPS_LOW_SCORE_ALERT, {
      tenantId,
      jobId,
      score,
      feedback,
      admins: admins.map((a) => a.id),
    });

    this.logger.warn(`Low NPS score (${score}) alert sent to ${admins.length} admins`);
  }

  private async calculateMonthlyTrend(tenantId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const surveys = await this.prisma.npsSurvey.findMany({
      where: {
        tenantId,
        respondedAt: { gte: sixMonthsAgo, not: null },
        score: { not: null },
      },
      select: { score: true, respondedAt: true },
    });

    // Group by month
    const monthlyData: Record<string, number[]> = {};

    for (const survey of surveys) {
      const month = survey.respondedAt!.toISOString().slice(0, 7);
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(survey.score!);
    }

    // Calculate NPS for each month
    return Object.entries(monthlyData)
      .map(([month, scores]) => {
        const total = scores.length;
        const promoters = scores.filter((s) => s >= 9).length;
        const detractors = scores.filter((s) => s <= 6).length;
        const nps = Math.round(((promoters - detractors) / total) * 100);
        return { month, nps, responses: total };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Cron job to expire old surveys
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireOldSurveys(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.npsSurvey.updateMany({
      where: {
        status: 'SENT',
        sentAt: { lt: thirtyDaysAgo },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} old NPS surveys`);
    }
  }
}
