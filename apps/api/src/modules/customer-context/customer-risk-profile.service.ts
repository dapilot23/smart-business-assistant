import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { RiskLevel, CustomerRiskProfile, Prisma } from '@prisma/client';
import { toNum } from '../../common/utils/decimal';

export interface RiskFactors {
  noShow: {
    noShowCount: number;
    daysSinceLastNoShow: number | null;
    recentAppointmentCount: number;
    noShowRate: number;
  };
  payment: {
    avgDaysLate: number;
    overdueCount: number;
    totalOwed: number;
    onTimePaymentRate: number;
  };
  churn: {
    daysSinceLastVisit: number;
    visitFrequency: number; // visits per 30 days
    engagementScore: number;
    recentCommunications: number;
  };
}

export interface RiskProfileSummary {
  customerId: string;
  customerName: string;
  overallRisk: number;
  riskLevel: RiskLevel;
  noShowRisk: number;
  paymentRisk: number;
  churnRisk: number;
  recommendedAction: string | null;
  lastCalculatedAt: Date;
}

const RISK_WEIGHTS = {
  noShow: 0.25,
  payment: 0.35,
  churn: 0.40,
};

@Injectable()
export class CustomerRiskProfileService {
  private readonly logger = new Logger(CustomerRiskProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateRiskProfile(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerRiskProfile> {
    const factors = await this.gatherRiskFactors(tenantId, customerId);
    const scores = this.calculateScores(factors);
    const overallRisk = this.calculateOverallRisk(scores);
    const riskLevel = this.determineRiskLevel(overallRisk);
    const recommendedAction = this.determineRecommendedAction(
      scores,
      riskLevel,
      factors,
    );

    const profile = await this.prisma.customerRiskProfile.upsert({
      where: { customerId },
      update: {
        noShowRisk: scores.noShow,
        paymentRisk: scores.payment,
        churnRisk: scores.churn,
        overallRisk,
        riskLevel,
        noShowFactors: factors.noShow as unknown as Prisma.InputJsonValue,
        paymentFactors: factors.payment as unknown as Prisma.InputJsonValue,
        churnFactors: factors.churn as unknown as Prisma.InputJsonValue,
        recommendedAction,
        actionPriority: this.calculateActionPriority(overallRisk, riskLevel),
        lastCalculatedAt: new Date(),
        riskHistory: {
          push: {
            date: new Date().toISOString(),
            noShowRisk: scores.noShow,
            paymentRisk: scores.payment,
            churnRisk: scores.churn,
            overallRisk,
          },
        },
      },
      create: {
        tenantId,
        customerId,
        noShowRisk: scores.noShow,
        paymentRisk: scores.payment,
        churnRisk: scores.churn,
        overallRisk,
        riskLevel,
        noShowFactors: factors.noShow as unknown as Prisma.InputJsonValue,
        paymentFactors: factors.payment as unknown as Prisma.InputJsonValue,
        churnFactors: factors.churn as unknown as Prisma.InputJsonValue,
        recommendedAction,
        actionPriority: this.calculateActionPriority(overallRisk, riskLevel),
        riskHistory: [
          {
            date: new Date().toISOString(),
            noShowRisk: scores.noShow,
            paymentRisk: scores.payment,
            churnRisk: scores.churn,
            overallRisk,
          },
        ],
      },
    });

    this.logger.log(
      `Risk profile calculated for customer ${customerId}: ${riskLevel} (${overallRisk.toFixed(1)})`,
    );

    return profile;
  }

  async getRiskProfile(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerRiskProfile | null> {
    return this.prisma.customerRiskProfile.findFirst({
      where: { tenantId, customerId },
    });
  }

  async getHighRiskCustomers(
    tenantId: string,
    limit = 20,
  ): Promise<RiskProfileSummary[]> {
    const profiles = await this.prisma.customerRiskProfile.findMany({
      where: {
        tenantId,
        riskLevel: { in: ['HIGH', 'CRITICAL'] },
      },
      include: { customer: { select: { name: true } } },
      orderBy: [{ actionPriority: 'desc' }, { overallRisk: 'desc' }],
      take: limit,
    });

    return profiles.map((p) => ({
      customerId: p.customerId,
      customerName: p.customer.name,
      overallRisk: p.overallRisk,
      riskLevel: p.riskLevel,
      noShowRisk: p.noShowRisk,
      paymentRisk: p.paymentRisk,
      churnRisk: p.churnRisk,
      recommendedAction: p.recommendedAction,
      lastCalculatedAt: p.lastCalculatedAt,
    }));
  }

  async getCustomersNeedingRecalculation(
    tenantId: string,
    staleHours = 24,
  ): Promise<string[]> {
    const staleDate = new Date();
    staleDate.setHours(staleDate.getHours() - staleHours);

    const staleProfiles = await this.prisma.customerRiskProfile.findMany({
      where: {
        tenantId,
        lastCalculatedAt: { lt: staleDate },
      },
      select: { customerId: true },
    });

    const customersWithoutProfiles = await this.prisma.customer.findMany({
      where: {
        tenantId,
        riskProfile: null,
      },
      select: { id: true },
    });

    return [
      ...staleProfiles.map((p) => p.customerId),
      ...customersWithoutProfiles.map((c) => c.id),
    ];
  }

  async recalculateAllProfiles(tenantId: string): Promise<number> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      select: { id: true },
    });

    let count = 0;
    for (const customer of customers) {
      try {
        await this.calculateRiskProfile(tenantId, customer.id);
        count++;
      } catch (error) {
        this.logger.error(
          `Failed to calculate risk for customer ${customer.id}:`,
          error,
        );
      }
    }

    return count;
  }

  private async gatherRiskFactors(
    tenantId: string,
    customerId: string,
  ): Promise<RiskFactors> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get customer with related data
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        appointments: {
          where: { scheduledAt: { gte: ninetyDaysAgo } },
          orderBy: { scheduledAt: 'desc' },
        },
        invoices: {
          where: { createdAt: { gte: ninetyDaysAgo } },
        },
      },
    });

    if (!customer) {
      return this.getDefaultFactors();
    }

    // No-show factors
    const noShowAppointments = customer.appointments.filter(
      (a) => a.status === 'NO_SHOW',
    );
    const completedAppointments = customer.appointments.filter(
      (a) => a.status === 'COMPLETED',
    );
    const recentAppointmentCount = customer.appointments.length;
    const lastNoShow = noShowAppointments[0];
    const daysSinceLastNoShow = lastNoShow
      ? Math.floor(
          (now.getTime() - lastNoShow.scheduledAt.getTime()) /
            (24 * 60 * 60 * 1000),
        )
      : null;
    const noShowRate =
      recentAppointmentCount > 0
        ? noShowAppointments.length / recentAppointmentCount
        : 0;

    // Payment factors
    const overdueInvoices = customer.invoices.filter(
      (i) => i.status === 'OVERDUE',
    );
    const paidInvoices = customer.invoices.filter((i) => i.status === 'PAID');
    const totalOwed = overdueInvoices.reduce(
      (sum, i) => sum + toNum(i.amount) - toNum(i.paidAmount),
      0,
    );
    const avgDaysLate = this.calculateAvgDaysLate(paidInvoices);
    const onTimePaymentRate =
      customer.invoices.length > 0
        ? paidInvoices.filter((i) => !i.paidAt || i.paidAt <= i.dueDate).length /
          customer.invoices.length
        : 1;

    // Churn factors
    const lastVisit = completedAppointments[0];
    const daysSinceLastVisit = lastVisit
      ? Math.floor(
          (now.getTime() - lastVisit.scheduledAt.getTime()) /
            (24 * 60 * 60 * 1000),
        )
      : 365;
    const recentVisits = completedAppointments.filter(
      (a) => a.scheduledAt >= thirtyDaysAgo,
    ).length;

    return {
      noShow: {
        noShowCount: customer.noShowCount,
        daysSinceLastNoShow,
        recentAppointmentCount,
        noShowRate,
      },
      payment: {
        avgDaysLate,
        overdueCount: overdueInvoices.length,
        totalOwed,
        onTimePaymentRate,
      },
      churn: {
        daysSinceLastVisit,
        visitFrequency: recentVisits,
        engagementScore: this.calculateEngagementScore(customer),
        recentCommunications: 0, // Would need message data
      },
    };
  }

  private calculateScores(factors: RiskFactors): {
    noShow: number;
    payment: number;
    churn: number;
  } {
    // No-show risk (0-100)
    let noShowScore = 0;
    noShowScore += Math.min(factors.noShow.noShowCount * 20, 40);
    noShowScore += factors.noShow.noShowRate * 40;
    if (
      factors.noShow.daysSinceLastNoShow !== null &&
      factors.noShow.daysSinceLastNoShow < 30
    ) {
      noShowScore += 20;
    }

    // Payment risk (0-100)
    let paymentScore = 0;
    paymentScore += Math.min(factors.payment.overdueCount * 15, 30);
    paymentScore += Math.min(factors.payment.avgDaysLate * 2, 30);
    paymentScore += (1 - factors.payment.onTimePaymentRate) * 40;

    // Churn risk (0-100)
    let churnScore = 0;
    if (factors.churn.daysSinceLastVisit > 90) {
      churnScore += 40;
    } else if (factors.churn.daysSinceLastVisit > 60) {
      churnScore += 25;
    } else if (factors.churn.daysSinceLastVisit > 30) {
      churnScore += 10;
    }
    churnScore += Math.max(0, 30 - factors.churn.visitFrequency * 10);
    churnScore += Math.max(0, 30 - factors.churn.engagementScore * 3);

    return {
      noShow: Math.min(100, Math.max(0, noShowScore)),
      payment: Math.min(100, Math.max(0, paymentScore)),
      churn: Math.min(100, Math.max(0, churnScore)),
    };
  }

  private calculateOverallRisk(scores: {
    noShow: number;
    payment: number;
    churn: number;
  }): number {
    return (
      scores.noShow * RISK_WEIGHTS.noShow +
      scores.payment * RISK_WEIGHTS.payment +
      scores.churn * RISK_WEIGHTS.churn
    );
  }

  private determineRiskLevel(overallRisk: number): RiskLevel {
    if (overallRisk >= 75) return 'CRITICAL';
    if (overallRisk >= 50) return 'HIGH';
    if (overallRisk >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private determineRecommendedAction(
    scores: { noShow: number; payment: number; churn: number },
    riskLevel: RiskLevel,
    factors: RiskFactors,
  ): string {
    if (riskLevel === 'LOW') {
      return 'No action needed - customer in good standing';
    }

    // Find the highest risk category
    const maxRisk = Math.max(scores.noShow, scores.payment, scores.churn);

    if (maxRisk === scores.payment && factors.payment.totalOwed > 0) {
      return `Follow up on $${factors.payment.totalOwed.toFixed(2)} outstanding balance`;
    }

    if (maxRisk === scores.churn && factors.churn.daysSinceLastVisit > 60) {
      return `Win-back outreach - ${factors.churn.daysSinceLastVisit} days since last visit`;
    }

    if (maxRisk === scores.noShow && factors.noShow.noShowCount >= 2) {
      return 'Require deposit for next booking due to no-show history';
    }

    if (riskLevel === 'CRITICAL') {
      return 'Schedule manager review - multiple risk factors present';
    }

    return 'Monitor closely - elevated risk detected';
  }

  private calculateActionPriority(
    overallRisk: number,
    riskLevel: RiskLevel,
  ): number {
    const baseScore = Math.floor(overallRisk);
    const levelBonus =
      riskLevel === 'CRITICAL' ? 100 : riskLevel === 'HIGH' ? 50 : 0;
    return baseScore + levelBonus;
  }

  private calculateAvgDaysLate(
    invoices: Array<{ dueDate: Date; paidAt: Date | null }>,
  ): number {
    const lateInvoices = invoices.filter(
      (i) => i.paidAt && i.paidAt > i.dueDate,
    );
    if (lateInvoices.length === 0) return 0;

    const totalDaysLate = lateInvoices.reduce((sum, i) => {
      const daysLate = Math.floor(
        (i.paidAt!.getTime() - i.dueDate.getTime()) / (24 * 60 * 60 * 1000),
      );
      return sum + Math.max(0, daysLate);
    }, 0);

    return totalDaysLate / lateInvoices.length;
  }

  private calculateEngagementScore(customer: {
    noShowCount: number;
    appointments: Array<{ status: string }>;
  }): number {
    const completed = customer.appointments.filter(
      (a) => a.status === 'COMPLETED',
    ).length;
    const total = customer.appointments.length;
    if (total === 0) return 5; // Neutral score for new customers

    const completionRate = completed / total;
    return Math.round(completionRate * 10);
  }

  private getDefaultFactors(): RiskFactors {
    return {
      noShow: {
        noShowCount: 0,
        daysSinceLastNoShow: null,
        recentAppointmentCount: 0,
        noShowRate: 0,
      },
      payment: {
        avgDaysLate: 0,
        overdueCount: 0,
        totalOwed: 0,
        onTimePaymentRate: 1,
      },
      churn: {
        daysSinceLastVisit: 0,
        visitFrequency: 0,
        engagementScore: 5,
        recentCommunications: 0,
      },
    };
  }
}
