import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { CopilotToolsService } from './copilot-tools.service';
import { WeeklyReport } from '@prisma/client';

interface WeeklyReportData {
  keyMetrics: {
    revenue: number;
    revenueChange?: number;
    jobsCompleted: number;
    appointmentCompletionRate: number;
    quoteConversionRate: number;
    npsScore: number;
  };
  topWins: string[];
  areasNeedingAttention: string[];
  actionItems: string[];
  forecast: string;
}

export interface WeeklyReportResult {
  id: string;
  tenantId: string;
  weekStart: Date;
  report: WeeklyReportData;
}

@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
    private readonly toolsService: CopilotToolsService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async generateWeeklyReports(): Promise<void> {
    this.logger.log('Starting weekly report generation for all tenants');

    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
    });

    for (const tenant of tenants) {
      try {
        await this.generateReportForTenant(tenant.id);
        this.logger.log(`Generated report for tenant ${tenant.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to generate report for tenant ${tenant.id}: ${error}`,
        );
      }
    }
  }

  async generateReportForTenant(tenantId: string): Promise<WeeklyReportResult> {
    const weekStart = this.getWeekStart();
    const weekEnd = new Date();

    const metrics = await this.gatherMetrics(tenantId, weekStart, weekEnd);
    const insights = await this.generateInsights(tenantId, metrics);

    const reportData: WeeklyReportData = {
      keyMetrics: metrics,
      ...insights,
    };

    const report = await this.prisma.weeklyReport.create({
      data: {
        tenantId,
        weekStart,
        report: reportData as any,
      },
    });

    return {
      id: report.id,
      tenantId: report.tenantId,
      weekStart: report.weekStart,
      report: reportData,
    };
  }

  async getLatestReport(tenantId: string): Promise<WeeklyReport | null> {
    return this.prisma.weeklyReport.findFirst({
      where: { tenantId },
      orderBy: { weekStart: 'desc' },
    });
  }

  async listReports(
    tenantId: string,
    limit = 12,
  ): Promise<WeeklyReport[]> {
    return this.prisma.weeklyReport.findMany({
      where: { tenantId },
      orderBy: { weekStart: 'desc' },
      take: limit,
    });
  }

  private getWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private async gatherMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WeeklyReportData['keyMetrics']> {
    const dateRange = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    const [revenue, appointments, quotes, retention, satisfaction] =
      await Promise.all([
        this.toolsService.executeTool('get_revenue_summary', dateRange, tenantId),
        this.toolsService.executeTool('get_appointment_stats', dateRange, tenantId),
        this.toolsService.executeTool('get_quote_pipeline', dateRange, tenantId),
        this.toolsService.executeTool('get_retention_metrics', {}, tenantId),
        this.toolsService.executeTool('get_customer_satisfaction', dateRange, tenantId),
      ]);

    return {
      revenue: (revenue as any).total ?? 0,
      jobsCompleted: (appointments as any).completed ?? 0,
      appointmentCompletionRate: (appointments as any).completionRate ?? 0,
      quoteConversionRate: (quotes as any).conversionRate ?? 0,
      npsScore: (satisfaction as any).npsScore ?? 0,
    };
  }

  private async generateInsights(
    tenantId: string,
    metrics: WeeklyReportData['keyMetrics'],
  ): Promise<Omit<WeeklyReportData, 'keyMetrics'>> {
    if (!this.aiEngine.isReady()) {
      return {
        topWins: [],
        areasNeedingAttention: [],
        actionItems: ['Review metrics manually'],
        forecast: 'AI insights unavailable',
      };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const result = await this.aiEngine.generateText({
      template: 'copilot.weekly-report',
      variables: {
        businessName: tenant?.name ?? 'Business',
        revenue: metrics.revenue,
        jobsCompleted: metrics.jobsCompleted,
        completionRate: metrics.appointmentCompletionRate,
        conversionRate: metrics.quoteConversionRate,
        npsScore: metrics.npsScore,
      },
      tenantId,
      feature: 'weekly-report',
      maxTokens: 1024,
    });

    try {
      const parsed = JSON.parse(result.data);
      return {
        topWins: parsed.topWins ?? [],
        areasNeedingAttention: parsed.areasNeedingAttention ?? [],
        actionItems: parsed.actionItems ?? [],
        forecast: parsed.forecast ?? '',
      };
    } catch {
      return {
        topWins: [],
        areasNeedingAttention: [],
        actionItems: [],
        forecast: result.data,
      };
    }
  }
}
