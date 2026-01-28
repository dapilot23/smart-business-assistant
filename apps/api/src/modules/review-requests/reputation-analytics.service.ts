import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class ReputationAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReputationDashboard(tenantId: string) {
    const [total, npsGated, platformBreakdown, recentRequests] =
      await Promise.all([
        this.getOverallStats(tenantId),
        this.getNpsGatedStats(tenantId),
        this.getPlatformBreakdown(tenantId),
        this.getRecentRequests(tenantId),
      ]);

    return {
      ...total,
      npsGatedStats: npsGated,
      platformBreakdown,
      recentRequests,
    };
  }

  private async getOverallStats(tenantId: string) {
    const totalRequests = await this.prisma.reviewRequest.count({
      where: { tenantId },
    });
    const sentCount = await this.prisma.reviewRequest.count({
      where: { tenantId, status: { in: ['SENT', 'CLICKED'] } },
    });
    const clickedCount = await this.prisma.reviewRequest.count({
      where: { tenantId, status: 'CLICKED' },
    });
    const clickRate = sentCount > 0
      ? Math.round((clickedCount / sentCount) * 1000) / 10
      : 0;

    return { totalRequests, sentCount, clickedCount, clickRate };
  }

  private async getNpsGatedStats(tenantId: string) {
    const sent = await this.prisma.reviewRequest.count({
      where: {
        tenantId,
        npsGated: true,
        status: { in: ['SENT', 'CLICKED'] },
      },
    });
    const clicked = await this.prisma.reviewRequest.count({
      where: { tenantId, npsGated: true, status: 'CLICKED' },
    });
    const conversionRate = sent > 0
      ? Math.round((clicked / sent) * 1000) / 10
      : 0;

    return { sent, clicked, conversionRate };
  }

  async getPlatformBreakdown(tenantId: string) {
    const clicked = await this.prisma.reviewRequest.findMany({
      where: { tenantId, status: 'CLICKED', platform: { not: null } },
      select: { platform: true },
    });

    const counts: Record<string, number> = {};
    for (const r of clicked) {
      const p = r.platform || 'unknown';
      counts[p] = (counts[p] || 0) + 1;
    }

    return Object.entries(counts).map(([platform, clickCount]) => ({
      platform,
      clickCount,
    }));
  }

  async getWeeklyVelocity(tenantId: string, weeks: number) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const clicked = await this.prisma.reviewRequest.findMany({
      where: {
        tenantId,
        status: 'CLICKED',
        clickedAt: { gte: since },
      },
      select: { clickedAt: true },
      orderBy: { clickedAt: 'asc' },
    });

    return this.groupByWeek(clicked, weeks);
  }

  private groupByWeek(
    items: { clickedAt: Date | null }[],
    weeks: number,
  ) {
    const result: { weekStart: string; count: number }[] = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const count = items.filter(
        (item) =>
          item.clickedAt &&
          item.clickedAt >= weekStart &&
          item.clickedAt < weekEnd,
      ).length;

      result.push({
        weekStart: weekStart.toISOString().split('T')[0],
        count,
      });
    }

    return result;
  }

  private async getRecentRequests(tenantId: string) {
    return this.prisma.reviewRequest.findMany({
      where: { tenantId },
      select: {
        id: true,
        status: true,
        platform: true,
        npsGated: true,
        npsScore: true,
        sentAt: true,
        clickedAt: true,
        createdAt: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
