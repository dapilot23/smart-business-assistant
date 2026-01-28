import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

export interface RecordUsageParams {
  tenantId: string;
  feature: string;
  template: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface TenantCostResult {
  totalCostCents: number;
  totalCalls: number;
  byFeature: Array<{
    feature: string;
    costCents: number;
    calls: number;
  }>;
}

export interface FeatureUsageResult {
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  totalCostCents: number;
}

// Claude Sonnet pricing (cents per million tokens)
const INPUT_COST_CENTS_PER_MTOK = 300; // $3.00
const OUTPUT_COST_CENTS_PER_MTOK = 1500; // $15.00

@Injectable()
export class AiCostTrackerService {
  private readonly logger = new Logger(AiCostTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  calculateCostCents(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * INPUT_COST_CENTS_PER_MTOK;
    const outputCost =
      (outputTokens / 1_000_000) * OUTPUT_COST_CENTS_PER_MTOK;
    const total = inputCost + outputCost;
    return total === 0 ? 0 : Math.ceil(total);
  }

  async recordUsage(params: RecordUsageParams): Promise<void> {
    const costCents = this.calculateCostCents(
      params.inputTokens,
      params.outputTokens,
    );

    try {
      await this.prisma.aiUsageLog.create({
        data: {
          tenantId: params.tenantId,
          feature: params.feature,
          template: params.template,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          costCents,
          latencyMs: params.latencyMs,
          success: params.success,
          errorMessage: params.errorMessage,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record AI usage: ${error.message}`,
        error.stack,
      );
    }
  }

  async getTenantCost(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TenantCostResult> {
    const where = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    };

    const [totals, byFeature] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({
        where,
        _sum: { costCents: true },
        _count: { id: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where,
        _sum: { costCents: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalCostCents: totals._sum.costCents ?? 0,
      totalCalls: totals._count.id,
      byFeature: byFeature.map((row) => ({
        feature: row.feature,
        costCents: row._sum.costCents ?? 0,
        calls: row._count.id,
      })),
    };
  }

  async getFeatureUsage(
    tenantId: string,
    feature: string,
    days?: number,
  ): Promise<FeatureUsageResult> {
    const where = this.buildFeatureWhere(tenantId, feature, days);

    const [totals, successCount] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({
        where,
        _count: { id: true },
        _sum: { costCents: true },
        _avg: { latencyMs: true },
      }),
      this.prisma.aiUsageLog.count({
        where: { ...where, success: true },
      }),
    ]);

    const totalCalls = totals._count.id;

    return {
      totalCalls,
      successRate: totalCalls > 0 ? successCount / totalCalls : 0,
      avgLatencyMs: totals._avg.latencyMs ?? 0,
      totalCostCents: totals._sum.costCents ?? 0,
    };
  }

  private buildFeatureWhere(
    tenantId: string,
    feature: string,
    days?: number,
  ) {
    const where: Record<string, unknown> = { tenantId, feature };
    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.createdAt = { gte: since };
    }
    return where;
  }
}
