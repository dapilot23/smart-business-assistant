import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { CopilotToolsService } from './copilot-tools.service';
import { AnomalySeverity } from '@prisma/client';

interface AiAnomaly {
  type: string;
  severity: string;
  description: string;
  possibleCause?: string;
  suggestedAction?: string;
}

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
    private readonly tools: CopilotToolsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async detectDailyAnomalies(): Promise<void> {
    const tenants = await this.prisma.withSystemContext(() =>
      this.prisma.tenant.findMany({ select: { id: true } }),
    );

    for (const tenant of tenants) {
      try {
        await this.prisma.withTenantContext(tenant.id, () =>
          this.detectForTenant(tenant.id),
        );
      } catch (error) {
        this.logger.error(`Anomaly detection failed for ${tenant.id}`, error);
      }
    }
  }

  async detectForTenant(tenantId: string) {
    const { todayStart, todayEnd, rollingStart } = this.getDateRanges();
    const [todayMetrics, rollingMetrics] = await Promise.all([
      this.getMetrics(tenantId, todayStart, todayEnd),
      this.getRollingAverage(tenantId, rollingStart, todayEnd),
    ]);

    if (!this.aiEngine.isReady()) {
      return [];
    }

    const response = await this.aiEngine.analyze<{ anomalies: AiAnomaly[] }>({
      template: 'copilot.anomaly-detection',
      variables: {
        todaysMetrics: JSON.stringify(todayMetrics),
        rollingAverage: JSON.stringify(rollingMetrics),
      },
      tenantId,
      feature: 'anomaly-detection',
      maxTokens: 512,
    });

    const anomalies = response.data?.anomalies || [];
    await this.storeAnomalies(tenantId, anomalies, todayStart, todayEnd);
    return anomalies;
  }

  async listAnomalies(tenantId: string, limit = 20) {
    return this.prisma.businessAnomaly.findMany({
      where: { tenantId },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });
  }

  async resolveAnomaly(tenantId: string, id: string, status: 'RESOLVED' | 'DISMISSED') {
    return this.prisma.businessAnomaly.update({
      where: { id, tenantId },
      data: {
        status,
        resolvedAt: new Date(),
      },
    });
  }

  private getDateRanges() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    const rollingStart = new Date(todayStart);
    rollingStart.setDate(todayStart.getDate() - 30);
    return { todayStart, todayEnd, rollingStart };
  }

  private async getMetrics(tenantId: string, start: Date, end: Date) {
    const range = { startDate: start.toISOString(), endDate: end.toISOString() };
    const [revenue, appointments] = await Promise.all([
      this.tools.executeTool('get_revenue_summary', range, tenantId),
      this.tools.executeTool('get_appointment_stats', range, tenantId),
    ]);

    return {
      revenue: (revenue as any).total ?? 0,
      appointments: appointments,
    };
  }

  private async getRollingAverage(tenantId: string, start: Date, end: Date) {
    const range = { startDate: start.toISOString(), endDate: end.toISOString() };
    const [revenue, appointments] = await Promise.all([
      this.tools.executeTool('get_revenue_summary', range, tenantId),
      this.tools.executeTool('get_appointment_stats', range, tenantId),
    ]);

    const revenueTotal = (revenue as any).total ?? 0;
    const appointmentStats = appointments as any;
    const days = 30;
    return {
      revenueAvgPerDay: Math.round(revenueTotal / days),
      appointmentsAvgPerDay: Math.round((appointmentStats.total || 0) / days),
      cancellationRate: appointmentStats.total
        ? Math.round((appointmentStats.cancelled / appointmentStats.total) * 100)
        : 0,
      noShowRate: appointmentStats.total
        ? Math.round((appointmentStats.noShows / appointmentStats.total) * 100)
        : 0,
    };
  }

  private async storeAnomalies(
    tenantId: string,
    anomalies: AiAnomaly[],
    periodStart: Date,
    periodEnd: Date,
  ) {
    for (const anomaly of anomalies) {
      if (!anomaly?.type || !anomaly?.description) {
        continue;
      }

      const exists = await this.prisma.businessAnomaly.findFirst({
        where: {
          tenantId,
          category: anomaly.type,
          detectedAt: { gte: periodStart },
        },
      });

      if (exists) continue;

      await this.prisma.businessAnomaly.create({
        data: {
          tenantId,
          category: anomaly.type,
          title: anomaly.type.replace(/_/g, ' '),
          description: anomaly.description,
          severity: this.mapSeverity(anomaly.severity),
          status: 'OPEN',
          periodStart,
          periodEnd,
          metrics: {
            possibleCause: anomaly.possibleCause,
            suggestedAction: anomaly.suggestedAction,
          } as any,
        },
      });
    }
  }

  private mapSeverity(value?: string): AnomalySeverity {
    switch ((value || '').toLowerCase()) {
      case 'low':
        return AnomalySeverity.LOW;
      case 'high':
        return AnomalySeverity.HIGH;
      case 'critical':
        return AnomalySeverity.CRITICAL;
      default:
        return AnomalySeverity.MEDIUM;
    }
  }
}
