import { AgentType, InsightPriority } from '@prisma/client';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { AiEngineService } from '../../ai-engine/ai-engine.service';
import { BaseAgent, AgentInsightInput, AgentRunContext } from './base-agent';

interface MarketingMetrics {
  tenantId: string;
  totalCustomers: number;
  newCustomersThisMonth: number;
  dormantCustomers: number;
  atRiskCustomers: number;
  highValueCustomers: number;
  recentNpsScores: number[];
}

export class MarketingAgent extends BaseAgent {
  constructor(prisma: PrismaService, aiEngine: AiEngineService) {
    super(prisma, aiEngine, AgentType.MARKETING);
  }

  getName(): string {
    return 'Marketing Agent';
  }

  getDescription(): string {
    return 'Suggests marketing campaigns and audience segments';
  }

  protected async fetchEntities(tenantId: string): Promise<MarketingMetrics[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalCustomers,
      newCustomers,
      dormantCustomers,
      atRiskCustomers,
      highValueCustomers,
      recentNps,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.customer.count({
        where: { tenantId, lifecycleStage: 'DORMANT' },
      }),
      this.prisma.customer.count({
        where: { tenantId, churnRisk: { gte: 0.6 } },
      }),
      this.prisma.customer.count({
        where: {
          tenantId,
          context: { totalSpent: { gte: 1000 } },
        },
      }),
      this.prisma.npsSurvey.findMany({
        where: {
          tenantId,
          respondedAt: { gte: thirtyDaysAgo },
          score: { not: null },
        },
        select: { score: true },
        take: 100,
      }),
    ]);

    return [
      {
        tenantId,
        totalCustomers,
        newCustomersThisMonth: newCustomers,
        dormantCustomers,
        atRiskCustomers,
        highValueCustomers,
        recentNpsScores: recentNps.map((n) => n.score!),
      },
    ];
  }

  protected async analyzeEntity(
    entity: unknown,
    context: AgentRunContext,
  ): Promise<AgentInsightInput[]> {
    const metrics = entity as MarketingMetrics;
    const insights: AgentInsightInput[] = [];

    // Suggest dormant customer win-back campaign
    if (metrics.dormantCustomers >= 10) {
      const confidence = 0.85;
      const impact = 0.7;
      insights.push({
        entityType: 'segment',
        entityId: 'dormant_customers',
        insightType: 'campaign_suggestion',
        title: 'Launch dormant customer win-back campaign',
        description:
          `You have ${metrics.dormantCustomers} dormant customers. ` +
          `A targeted win-back campaign with a special offer could re-engage them.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: InsightPriority.HIGH,
        recommendedAction: 'Create SMS campaign targeting dormant customers',
        actionParams: {
          segment: 'DORMANT',
          suggestedOffer: '15% off next service',
          estimatedReach: metrics.dormantCustomers,
        },
        actionLabel: 'Create Campaign',
        expiresAt: this.addDays(new Date(), 14),
        aiReasoning:
          'Win-back campaigns typically have 10-15% success rates. ' +
          'Even a small percentage of re-engaged customers adds significant value.',
      });
    }

    // At-risk customer retention suggestion
    if (metrics.atRiskCustomers >= 5) {
      const confidence = 0.8;
      const impact = 0.8;
      insights.push({
        entityType: 'segment',
        entityId: 'at_risk_customers',
        insightType: 'retention_campaign',
        title: 'Prevent churn with retention campaign',
        description:
          `${metrics.atRiskCustomers} customers are at high churn risk. ` +
          `A proactive retention campaign could save valuable relationships.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: InsightPriority.HIGH,
        recommendedAction: 'Send personalized retention offers',
        actionParams: {
          segment: 'AT_RISK',
          estimatedReach: metrics.atRiskCustomers,
        },
        actionLabel: 'Start Retention',
        expiresAt: this.addDays(new Date(), 7),
        aiReasoning:
          'Retaining existing customers is 5-25x cheaper than acquiring new ones.',
      });
    }

    // NPS analysis
    if (metrics.recentNpsScores.length >= 10) {
      const avgNps =
        metrics.recentNpsScores.reduce((a, b) => a + b, 0) /
        metrics.recentNpsScores.length;
      const promoters = metrics.recentNpsScores.filter((s) => s >= 9).length;
      const detractors = metrics.recentNpsScores.filter((s) => s <= 6).length;
      const npsScore = Math.round(
        ((promoters - detractors) / metrics.recentNpsScores.length) * 100,
      );

      if (promoters >= 5) {
        insights.push({
          entityType: 'segment',
          entityId: 'promoters',
          insightType: 'referral_opportunity',
          title: 'Launch referral program to promoters',
          description:
            `You have ${promoters} promoters (NPS 9-10). ` +
            `These happy customers are ideal for a referral program. ` +
            `Current NPS score: ${npsScore}.`,
          confidenceScore: 0.9,
          impactScore: 0.75,
          priority: InsightPriority.MEDIUM,
          recommendedAction: 'Invite promoters to referral program',
          actionParams: {
            segment: 'PROMOTERS',
            npsScore,
            promoterCount: promoters,
          },
          actionLabel: 'Start Referral Program',
          expiresAt: this.addDays(new Date(), 30),
          aiReasoning:
            'Promoters are 4x more likely to refer friends. ' +
            'Referral programs from happy customers have high conversion rates.',
        });
      }

      if (detractors >= 3) {
        insights.push({
          entityType: 'segment',
          entityId: 'detractors',
          insightType: 'detractor_recovery',
          title: 'Follow up with detractors',
          description:
            `${detractors} customers gave low NPS scores (6 or below). ` +
            `Personal follow-up could turn them around.`,
          confidenceScore: 0.85,
          impactScore: 0.6,
          priority: InsightPriority.MEDIUM,
          recommendedAction: 'Schedule personal calls with detractors',
          actionParams: {
            segment: 'DETRACTORS',
            detractorCount: detractors,
          },
          actionLabel: 'View Detractors',
          expiresAt: this.addDays(new Date(), 14),
          aiReasoning:
            'Detractors who receive follow-up often become loyal customers. ' +
            'They appreciate businesses that care about their feedback.',
        });
      }
    }

    // Seasonal campaign suggestion (simplified)
    const month = new Date().getMonth();
    const seasonalCampaigns: Record<number, { name: string; focus: string }> = {
      2: { name: 'Spring Tune-Up', focus: 'HVAC maintenance' },
      5: { name: 'Summer Ready', focus: 'AC services' },
      8: { name: 'Fall Prep', focus: 'Heating inspection' },
      11: { name: 'Holiday Special', focus: 'Year-end discounts' },
    };

    if (seasonalCampaigns[month]) {
      const campaign = seasonalCampaigns[month];
      insights.push({
        entityType: 'campaign',
        entityId: `seasonal_${month}`,
        insightType: 'seasonal_campaign',
        title: `Time for ${campaign.name} campaign`,
        description:
          `It's the perfect time for a ${campaign.focus} campaign. ` +
          `Reach out to your ${metrics.totalCustomers} customers.`,
        confidenceScore: 0.75,
        impactScore: 0.6,
        priority: InsightPriority.MEDIUM,
        recommendedAction: `Create ${campaign.name} email/SMS campaign`,
        actionParams: {
          campaignType: 'SEASONAL',
          name: campaign.name,
          focus: campaign.focus,
        },
        actionLabel: 'Create Campaign',
        expiresAt: this.addDays(new Date(), 21),
        aiReasoning:
          'Seasonal campaigns align with customer needs and timing.',
      });
    }

    return insights;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
