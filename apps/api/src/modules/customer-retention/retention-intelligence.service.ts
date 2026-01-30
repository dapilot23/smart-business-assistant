import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';

export interface ChurnPrediction {
  churnProbability: number;
  churnTimeframe: string;
  churnReasons: string[];
  riskLevel: string;
  recommendedIntervention: { type: string; message: string; urgency: string };
}

export interface ServiceNeed {
  service: string;
  predictedDate: string;
  confidence: number;
  reason: string;
}

const DAY_MS = 86_400_000;

@Injectable()
export class RetentionIntelligenceService {
  private readonly logger = new Logger(RetentionIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngineService: AiEngineService,
  ) {}

  async computeHealthScore(customerId: string, tenantId: string): Promise<number> {
    const c = await this.fetchCustomer(customerId);
    if (!c) return 0;
    const tenure = this.tenureMonths(c.createdAt);
    const raw =
      this.calcFrequencyScore(c.appointments, tenure) +
      this.calcPaymentScore(c.invoices) +
      this.calcRecencyScore(c.appointments) +
      this.calcEngagementScore(c);
    return Math.min(100, Math.max(0, raw));
  }

  async predictChurn(customerId: string, tenantId: string): Promise<ChurnPrediction> {
    const c = await this.fetchCustomer(customerId);
    const healthScore = await this.computeHealthScore(customerId, tenantId);
    const result = await this.aiEngineService.analyze<ChurnPrediction>({
      template: 'retention.predict-churn',
      tenantId,
      feature: 'retention-churn',
      variables: {
        healthScore,
        daysSinceLastService: this.daysSinceLast(c?.appointments),
        frequencyTrend: this.freqTrend(c?.appointments),
        lastNpsScore: c?.context?.totalVisits ?? 0,
        paymentTrend: this.payTrend(c?.invoices),
        customerTenure: this.tenureMonths(c?.createdAt),
        customerCLV: c?.context?.totalSpent ?? 0,
      },
    });
    const stage = this.riskToStage(result.data.riskLevel);
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { churnRisk: result.data.churnProbability, lifecycleStage: stage },
    });
    return result.data;
  }

  async generateWinbackMessage(customerId: string, tenantId: string): Promise<string> {
    const c = await this.fetchCustomer(customerId);
    const result = await this.aiEngineService.generateText({
      template: 'retention.generate-winback',
      tenantId,
      feature: 'retention-winback',
      tone: 'friendly',
      variables: {
        customerName: c?.name ?? 'Valued Customer',
        lastService: c?.context?.lastServiceType ?? 'service',
        daysSinceLastVisit: this.daysSinceLast(c?.appointments),
        totalVisits: c?.context?.totalVisits ?? 0,
        totalSpent: c?.context?.totalSpent ?? 0,
        businessName: c?.tenant?.name ?? 'our business',
      },
    });
    return result.data;
  }

  async predictServiceNeeds(customerId: string, tenantId: string): Promise<ServiceNeed[]> {
    const c = await this.fetchCustomer(customerId);
    const appts = c?.appointments ?? [];
    const result = await this.aiEngineService.analyze<{ predictedNeeds: ServiceNeed[] }>({
      template: 'retention.predict-service-need',
      tenantId,
      feature: 'retention-service-needs',
      variables: {
        customerEquipment: c?.equipment ?? [],
        serviceHistory: this.buildHistory(appts),
        seasonalPatterns: this.seasonality(appts),
      },
    });
    return result.data.predictedNeeds;
  }

  @Cron('0 5 * * *')
  async updateAllHealthScores(): Promise<void> {
    const tenants = await this.prisma.withSystemContext(() =>
      this.prisma.tenant.findMany({ select: { id: true } }),
    );
    for (const t of tenants) {
      await this.prisma.withTenantContext(t.id, () => this.processTenant(t.id));
    }
    this.logger.log('Completed daily health score update for all tenants');
  }

  // --- Private helpers (data fetch) ---

  private fetchCustomer(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: { appointments: true, invoices: true, context: true, equipment: true, tenant: true },
    });
  }

  private async processTenant(tenantId: string): Promise<void> {
    const customers = await this.prisma.customer.findMany({ where: { tenantId }, select: { id: true } });
    for (const c of customers) {
      const score = await this.computeHealthScore(c.id, tenantId);
      const stage = score >= 70 ? 'ACTIVE' : score >= 40 ? 'AT_RISK' : 'DORMANT';
      await this.prisma.customer.update({ where: { id: c.id }, data: { healthScore: score, lifecycleStage: stage } });
    }
  }

  // --- Private helpers (scoring, max 30+25+25+20 = 100) ---

  private calcFrequencyScore(appts: any[], tenureMonths: number): number {
    if (tenureMonths <= 0) return 0;
    const cutoff = new Date(Date.now() - 180 * DAY_MS);
    const recent = (appts ?? []).filter((a: any) => a.status === 'COMPLETED' && new Date(a.scheduledAt) >= cutoff);
    return Math.min(30, Math.round((recent.length / Math.max(tenureMonths / 6, 1)) * 15));
  }

  private calcPaymentScore(invoices: any[]): number {
    if (!invoices?.length) return 0;
    return Math.round((invoices.filter((i: any) => i.status === 'PAID').length / invoices.length) * 25);
  }

  private calcRecencyScore(appts: any[]): number {
    const completed = (appts ?? []).filter((a: any) => a.status === 'COMPLETED');
    if (!completed.length) return 0;
    const latest = completed.reduce((m: Date, a: any) => { const d = new Date(a.scheduledAt); return d > m ? d : m; }, new Date(0));
    const days = (Date.now() - latest.getTime()) / DAY_MS;
    if (days <= 7) return 25;
    if (days <= 30) return 20;
    if (days <= 90) return 12;
    return days <= 180 ? 5 : 0;
  }

  private calcEngagementScore(customer: any): number {
    let s = customer?.context ? 10 : 0;
    if (customer?.context?.lastInteraction) {
      const d = (Date.now() - new Date(customer.context.lastInteraction).getTime()) / DAY_MS;
      if (d <= 30) s += 5;
    }
    return Math.max(0, s - Math.min(10, (customer?.noShowCount ?? 0) * 2));
  }

  // --- Private helpers (AI variable builders) ---

  private daysSinceLast(appts: any[] | undefined): number {
    const done = (appts ?? []).filter((a: any) => a.status === 'COMPLETED');
    if (!done.length) return 999;
    const latest = done.reduce((m: Date, a: any) => { const d = new Date(a.scheduledAt); return d > m ? d : m; }, new Date(0));
    return Math.round((Date.now() - latest.getTime()) / DAY_MS);
  }

  private tenureMonths(createdAt: Date | undefined): number {
    if (!createdAt) return 1;
    return Math.max(1, Math.round((Date.now() - new Date(createdAt).getTime()) / (30 * DAY_MS)));
  }

  private riskToStage(risk: string): string {
    return risk === 'HIGH' || risk === 'CRITICAL' ? 'AT_RISK' : 'ACTIVE';
  }

  private freqTrend(appts: any[] | undefined): string {
    const c = (appts ?? []).filter((a: any) => a.status === 'COMPLETED').length;
    return c < 2 ? 'insufficient_data' : c >= 4 ? 'stable' : 'declining';
  }

  private payTrend(invoices: any[] | undefined): string {
    if (!invoices?.length) return 'no_data';
    return invoices.filter((i: any) => i.status === 'PAID').length / invoices.length >= 0.8 ? 'good' : 'concerning';
  }

  private buildHistory(appts: any[]): any[] {
    return appts.filter((a: any) => a.status === 'COMPLETED')
      .map((a: any) => ({ date: a.scheduledAt, service: a.service?.name ?? 'Unknown' }));
  }

  private seasonality(appts: any[]): string {
    const mo = (appts ?? []).filter((a: any) => a.status === 'COMPLETED').map((a: any) => new Date(a.scheduledAt).getMonth());
    return !mo.length ? 'none' : mo.filter((m) => m >= 5 && m <= 8).length > mo.length / 2 ? 'summer_peak' : 'year_round';
  }
}
