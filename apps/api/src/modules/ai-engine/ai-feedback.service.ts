import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiFeedbackAction } from '@prisma/client';

export interface RecordFeedbackParams {
  tenantId: string;
  feature: string;
  template: string;
  aiOutput: string;
  action: 'ACCEPTED' | 'EDITED' | 'REJECTED';
  humanEdit?: string;
}

export interface AcceptanceRateResult {
  total: number;
  accepted: number;
  edited: number;
  rejected: number;
  acceptanceRate: number;
}

export interface FeatureAcceptanceResult {
  feature: string;
  total: number;
  acceptanceRate: number;
}

@Injectable()
export class AiFeedbackService {
  private readonly logger = new Logger(AiFeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordFeedback(params: RecordFeedbackParams): Promise<void> {
    try {
      await this.prisma.aiFeedback.create({
        data: {
          tenantId: params.tenantId,
          feature: params.feature,
          template: params.template,
          aiOutput: params.aiOutput,
          action: params.action as AiFeedbackAction,
          humanEdit: params.humanEdit,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record AI feedback: ${error.message}`,
        error.stack,
      );
    }
  }

  async getAcceptanceRate(
    tenantId: string,
    feature: string,
    days?: number,
  ): Promise<AcceptanceRateResult> {
    const where = this.buildWhere(tenantId, feature, days);

    const [total, accepted, edited, rejected] = await Promise.all([
      this.prisma.aiFeedback.count({ where }),
      this.prisma.aiFeedback.count({
        where: { ...where, action: AiFeedbackAction.ACCEPTED },
      }),
      this.prisma.aiFeedback.count({
        where: { ...where, action: AiFeedbackAction.EDITED },
      }),
      this.prisma.aiFeedback.count({
        where: { ...where, action: AiFeedbackAction.REJECTED },
      }),
    ]);

    return {
      total,
      accepted,
      edited,
      rejected,
      acceptanceRate: total > 0 ? accepted / total : 0,
    };
  }

  async getTenantAcceptanceRates(
    tenantId: string,
    days?: number,
  ): Promise<FeatureAcceptanceResult[]> {
    const where = this.buildWhere(tenantId, undefined, days);

    const features = await this.prisma.aiFeedback.groupBy({
      by: ['feature'],
      where,
      _count: { id: true },
    });

    const results: FeatureAcceptanceResult[] = [];

    for (const row of features) {
      const acceptedCount = await this.prisma.aiFeedback.count({
        where: {
          ...where,
          feature: row.feature,
          action: AiFeedbackAction.ACCEPTED,
        },
      });

      results.push({
        feature: row.feature,
        total: row._count.id,
        acceptanceRate:
          row._count.id > 0 ? acceptedCount / row._count.id : 0,
      });
    }

    return results;
  }

  private buildWhere(
    tenantId: string,
    feature?: string,
    days?: number,
  ) {
    const where: Record<string, unknown> = { tenantId };
    if (feature) where.feature = feature;
    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.createdAt = { gte: since };
    }
    return where;
  }
}
