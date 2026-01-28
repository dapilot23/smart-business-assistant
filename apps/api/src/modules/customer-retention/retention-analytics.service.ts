import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

export interface CustomerCLV {
  customerId: string;
  customerName: string;
  totalSpent: number;
  visitCount: number;
  averageTicket: number;
  tenureMonths: number;
  annualizedCLV: number;
}

export interface RetentionDashboard {
  totalCustomers: number;
  activeCustomers: number;
  dormantCustomers: number;
  atRiskCustomers: number;
  churnRate: number;
  winbackSuccessRate: number;
  activeCampaigns: number;
  averageCLV: number;
}

@Injectable()
export class RetentionAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateCLV(
    customerId: string,
    tenantId: string,
  ): Promise<CustomerCLV> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: { invoices: { where: { status: 'PAID' } } },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer ${customerId} not found`,
      );
    }

    return this.buildCLV(customer);
  }

  async getTopCustomers(
    tenantId: string,
    limit: number = 10,
  ): Promise<CustomerCLV[]> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      include: { invoices: { where: { status: 'PAID' } } },
    });

    return customers
      .map((c) => this.buildCLV(c))
      .sort((a, b) => b.annualizedCLV - a.annualizedCLV)
      .slice(0, limit);
  }

  async getChurnRate(
    tenantId: string,
    periodDays: number = 90,
  ): Promise<number> {
    const total = await this.prisma.customer.count({
      where: { tenantId },
    });

    if (total === 0) return 0;

    const dormant = await this.prisma.customer.count({
      where: {
        tenantId,
        lifecycleStage: { in: ['DORMANT', 'LOST'] },
      },
    });

    return dormant / total;
  }

  async getDashboardMetrics(
    tenantId: string,
  ): Promise<RetentionDashboard> {
    const [counts, campaigns, avgCLV] = await Promise.all([
      this.fetchCustomerCounts(tenantId),
      this.fetchCampaignMetrics(tenantId),
      this.computeAverageCLV(tenantId),
    ]);

    const churnRate = await this.getChurnRate(tenantId);

    return {
      ...counts,
      churnRate,
      ...campaigns,
      averageCLV: avgCLV,
    };
  }

  private buildCLV(customer: any): CustomerCLV {
    const invoices = customer.invoices ?? [];
    const totalSpent = invoices.reduce(
      (sum: number, inv: any) => sum + parseFloat(inv.amount),
      0,
    );
    const visitCount = invoices.length;
    const averageTicket =
      visitCount > 0 ? totalSpent / visitCount : 0;
    const tenureMonths = this.monthsBetween(
      customer.createdAt,
      new Date(),
    );
    const annualizedCLV =
      tenureMonths > 0
        ? (totalSpent / tenureMonths) * 12
        : totalSpent;

    return {
      customerId: customer.id,
      customerName: customer.name,
      totalSpent,
      visitCount,
      averageTicket,
      tenureMonths,
      annualizedCLV,
    };
  }

  private monthsBetween(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth())
    );
  }

  private async fetchCustomerCounts(tenantId: string) {
    const [totalCustomers, activeCustomers, dormantCustomers, atRiskCustomers] =
      await Promise.all([
        this.prisma.customer.count({ where: { tenantId } }),
        this.prisma.customer.count({
          where: { tenantId, lifecycleStage: { in: ['ACTIVE', 'NEW'] } },
        }),
        this.prisma.customer.count({
          where: { tenantId, lifecycleStage: 'DORMANT' },
        }),
        this.prisma.customer.count({
          where: { tenantId, lifecycleStage: 'AT_RISK' },
        }),
      ]);

    return { totalCustomers, activeCustomers, dormantCustomers, atRiskCustomers };
  }

  private async fetchCampaignMetrics(tenantId: string) {
    const [totalSent, winbackSuccess, activeCampaigns] =
      await Promise.all([
        this.prisma.retentionCampaign.count({
          where: { tenantId, status: 'SENT' },
        }),
        this.prisma.retentionCampaign.count({
          where: {
            tenantId,
            status: 'SENT',
            customer: { lifecycleStage: 'ACTIVE' },
          },
        }),
        this.prisma.retentionCampaign.count({
          where: { tenantId, status: 'PENDING' },
        }),
      ]);

    const winbackSuccessRate =
      totalSent > 0 ? winbackSuccess / totalSent : 0;

    return { winbackSuccessRate, activeCampaigns };
  }

  private async computeAverageCLV(
    tenantId: string,
  ): Promise<number> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      include: { invoices: { where: { status: 'PAID' } } },
    });

    if (customers.length === 0) return 0;

    const clvs = customers.map((c) => this.buildCLV(c));
    const total = clvs.reduce((s, c) => s + c.annualizedCLV, 0);
    return total / clvs.length;
  }
}
