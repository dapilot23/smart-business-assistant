import { AgentType, InsightPriority, Customer } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { AiEngineService } from '../../ai-engine/ai-engine.service';
import { BaseAgent, AgentInsightInput, AgentRunContext } from './base-agent';

interface CustomerWithContext extends Customer {
  context: { totalSpent: Decimal; lastInteraction: Date | null; totalVisits: number } | null;
  _count: { appointments: number };
}

interface AiChurnAnalysis {
  churnRiskAssessment: number;
  churnTimeframe: string;
  primaryRiskFactors: string[];
  recommendedAction: string;
  suggestedOffer: string | null;
  reasoning: string;
}

export class CustomerSuccessAgent extends BaseAgent {
  constructor(prisma: PrismaService, aiEngine: AiEngineService) {
    super(prisma, aiEngine, AgentType.CUSTOMER_SUCCESS);
  }

  getName(): string {
    return 'Customer Success Agent';
  }

  getDescription(): string {
    return 'Monitors customer health and identifies churn risks';
  }

  protected async fetchEntities(tenantId: string): Promise<CustomerWithContext[]> {
    return this.prisma.customer.findMany({
      where: { tenantId },
      include: {
        context: {
          select: { totalSpent: true, lastInteraction: true, totalVisits: true },
        },
        _count: {
          select: { appointments: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  protected async analyzeEntity(
    entity: unknown,
    context: AgentRunContext,
  ): Promise<AgentInsightInput[]> {
    const customer = entity as CustomerWithContext;
    const insights: AgentInsightInput[] = [];

    // Only analyze customers with some history
    if (customer._count.appointments < 1) {
      return insights;
    }

    // Try AI analysis for high-value or at-risk customers
    const totalSpent = Number(customer.context?.totalSpent ?? 0);
    const shouldUseAi =
      this.aiEngine.isReady() &&
      (customer.churnRisk >= 0.5 || totalSpent >= 500 || customer.healthScore <= 40);

    if (shouldUseAi) {
      const aiInsights = await this.analyzeWithAi(customer, context);
      if (aiInsights.length > 0) {
        return aiInsights;
      }
    }

    // Fallback to rule-based analysis
    return this.analyzeWithRules(customer);
  }

  private async analyzeWithAi(
    customer: CustomerWithContext,
    context: AgentRunContext,
  ): Promise<AgentInsightInput[]> {
    const insights: AgentInsightInput[] = [];

    const daysSinceLastVisit = customer.context?.lastInteraction
      ? Math.floor(
          (Date.now() - new Date(customer.context.lastInteraction).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    try {
      const result = await this.aiEngine.generateText({
        template: 'agent.customer-churn-analysis',
        variables: {
          customerName: customer.name,
          healthScore: customer.healthScore.toString(),
          churnRisk: Math.round(customer.churnRisk * 100).toString(),
          lifecycleStage: customer.lifecycleStage,
          totalAppointments: customer._count.appointments.toString(),
          noShowCount: customer.noShowCount.toString(),
          daysSinceLastVisit: daysSinceLastVisit?.toString() ?? 'unknown',
          totalSpent: `$${Number(customer.context?.totalSpent ?? 0).toFixed(2)}`,
          avgVisitFrequency: this.calculateAvgFrequency(customer),
        },
        tenantId: context.tenantId,
        feature: 'agent-customer-success',
      });

      this.trackTokens(result.inputTokens, result.outputTokens);

      const analysis = this.parseAiResponse(result.data);
      if (!analysis) return insights;

      // Only create insight if action is recommended
      if (analysis.recommendedAction === 'no_action') return insights;

      const confidence = analysis.churnRiskAssessment;
      const impact = this.calculateImpactFromSpend(Number(customer.context?.totalSpent ?? 0));

      insights.push({
        entityType: 'customer',
        entityId: customer.id,
        insightType: this.mapActionToInsightType(analysis.recommendedAction),
        title: this.generateTitle(customer, analysis),
        description: this.generateDescription(customer, analysis, daysSinceLastVisit),
        confidenceScore: confidence,
        impactScore: impact,
        priority: this.calculatePriority(confidence, impact),
        recommendedAction: this.mapActionToRecommendation(analysis, customer),
        actionParams: {
          customerId: customer.id,
          phone: customer.phone,
          email: customer.email,
          suggestedOffer: analysis.suggestedOffer,
          riskFactors: analysis.primaryRiskFactors,
        },
        actionLabel: this.mapActionToLabel(analysis.recommendedAction),
        expiresAt: this.calculateExpiry(analysis.churnTimeframe),
        aiReasoning: analysis.reasoning,
      });
    } catch (error) {
      this.logger.warn(`AI analysis failed for customer ${customer.id}`, error);
    }

    return insights;
  }

  private analyzeWithRules(customer: CustomerWithContext): AgentInsightInput[] {
    const insights: AgentInsightInput[] = [];

    const daysSinceLastInteraction = customer.context?.lastInteraction
      ? Math.floor(
          (Date.now() - new Date(customer.context.lastInteraction).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    // High churn risk detection
    if (customer.churnRisk >= 0.7) {
      const confidence = customer.churnRisk;
      const impact = this.calculateImpactFromSpend(Number(customer.context?.totalSpent ?? 0));
      insights.push({
        entityType: 'customer',
        entityId: customer.id,
        insightType: 'churn_risk',
        title: `${customer.name} is at high churn risk`,
        description:
          `${customer.name} has a ${Math.round(customer.churnRisk * 100)}% churn risk. ` +
          `Last interaction was ${daysSinceLastInteraction ?? 'unknown'} days ago.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: this.calculatePriority(confidence, impact),
        recommendedAction: 'Send win-back campaign with special offer',
        actionParams: {
          customerId: customer.id,
          phone: customer.phone,
          suggestedDiscount: 15,
        },
        actionLabel: 'Send Offer',
        expiresAt: this.addDays(new Date(), 7),
        aiReasoning: 'High churn risk requires proactive outreach with an incentive.',
      });
    }

    // Dormant customer re-engagement
    if (
      daysSinceLastInteraction !== null &&
      daysSinceLastInteraction >= 60 &&
      customer.lifecycleStage !== 'DORMANT'
    ) {
      insights.push({
        entityType: 'customer',
        entityId: customer.id,
        insightType: 'dormant_customer',
        title: `Re-engage ${customer.name}`,
        description:
          `${customer.name} hasn't visited in ${daysSinceLastInteraction} days. ` +
          `They've had ${customer._count.appointments} appointments with you.`,
        confidenceScore: 0.8,
        impactScore: 0.6,
        priority: InsightPriority.MEDIUM,
        recommendedAction: 'Send re-engagement SMS',
        actionParams: {
          customerId: customer.id,
          phone: customer.phone,
          template: 'dormant_winback',
        },
        actionLabel: 'Send SMS',
        expiresAt: this.addDays(new Date(), 14),
        aiReasoning: 'Dormant customers need a reminder of your services.',
      });
    }

    // VIP customer detection
    const totalSpent = Number(customer.context?.totalSpent ?? 0);
    if (totalSpent >= 2000 && customer.healthScore >= 80) {
      insights.push({
        entityType: 'customer',
        entityId: customer.id,
        insightType: 'vip_customer',
        title: `${customer.name} is a VIP customer`,
        description:
          `${customer.name} has spent ${this.formatCurrency(totalSpent)} and ` +
          `has a health score of ${customer.healthScore}.`,
        confidenceScore: 0.9,
        impactScore: 0.7,
        priority: InsightPriority.LOW,
        recommendedAction: 'Add to VIP program and send thank you',
        actionParams: { customerId: customer.id, totalSpent },
        actionLabel: 'Make VIP',
        expiresAt: this.addDays(new Date(), 30),
        aiReasoning: 'VIP customers deserve recognition and special treatment.',
      });
    }

    // No-show pattern detection
    if (customer.noShowCount >= 2) {
      insights.push({
        entityType: 'customer',
        entityId: customer.id,
        insightType: 'noshow_pattern',
        title: `${customer.name} has a no-show pattern`,
        description: `${customer.name} has ${customer.noShowCount} no-shows.`,
        confidenceScore: 0.85,
        impactScore: 0.4,
        priority: InsightPriority.MEDIUM,
        recommendedAction: 'Enable deposit requirement for this customer',
        actionParams: { customerId: customer.id, noShowCount: customer.noShowCount },
        actionLabel: 'Require Deposit',
        expiresAt: this.addDays(new Date(), 30),
        aiReasoning: 'Deposits create accountability and reduce no-shows.',
      });
    }

    return insights;
  }

  private parseAiResponse(response: string): AiChurnAnalysis | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  private calculateAvgFrequency(customer: CustomerWithContext): string {
    const visits = customer.context?.totalVisits ?? customer._count.appointments;
    if (visits <= 1) return 'new customer';
    // Rough estimate based on total visits
    return `${Math.round(365 / visits)} days`;
  }

  private mapActionToInsightType(action: string): string {
    const mapping: Record<string, string> = {
      personal_call: 'churn_risk',
      send_offer: 'retention_opportunity',
      loyalty_program: 'vip_opportunity',
      service_reminder: 'reengagement_needed',
    };
    return mapping[action] ?? 'customer_health';
  }

  private generateTitle(customer: CustomerWithContext, analysis: AiChurnAnalysis): string {
    const actions: Record<string, string> = {
      personal_call: `Call ${customer.name} - high churn risk`,
      send_offer: `Send retention offer to ${customer.name}`,
      loyalty_program: `Add ${customer.name} to loyalty program`,
      service_reminder: `Remind ${customer.name} about services`,
    };
    return actions[analysis.recommendedAction] ?? `Review ${customer.name}'s account`;
  }

  private generateDescription(
    customer: CustomerWithContext,
    analysis: AiChurnAnalysis,
    daysSinceLastVisit: number | null,
  ): string {
    const riskFactors = analysis.primaryRiskFactors.slice(0, 2).join(', ');
    return (
      `${customer.name} has ${Math.round(analysis.churnRiskAssessment * 100)}% churn risk. ` +
      `Risk factors: ${riskFactors}. ` +
      `Last visit: ${daysSinceLastVisit ?? 'unknown'} days ago. ` +
      analysis.reasoning
    );
  }

  private mapActionToRecommendation(
    analysis: AiChurnAnalysis,
    customer: CustomerWithContext,
  ): string {
    if (analysis.suggestedOffer) {
      return `${analysis.suggestedOffer} for ${customer.name}`;
    }
    const actions: Record<string, string> = {
      personal_call: `Call ${customer.name} to check in and offer assistance`,
      send_offer: `Send personalized retention offer`,
      loyalty_program: `Enroll in VIP/loyalty program`,
      service_reminder: `Send service reminder with easy booking link`,
    };
    return actions[analysis.recommendedAction] ?? 'Review account and take appropriate action';
  }

  private mapActionToLabel(action: string): string {
    const labels: Record<string, string> = {
      personal_call: 'Call Now',
      send_offer: 'Send Offer',
      loyalty_program: 'Make VIP',
      service_reminder: 'Send Reminder',
    };
    return labels[action] ?? 'Take Action';
  }

  private calculateExpiry(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '30_days':
        return this.addDays(now, 7);
      case '60_days':
        return this.addDays(now, 14);
      case '90_days':
        return this.addDays(now, 21);
      case 'stable':
        return this.addDays(now, 30);
      default:
        return this.addDays(now, 14);
    }
  }

  private calculateImpactFromSpend(totalSpent: number): number {
    if (totalSpent >= 5000) return 0.95;
    if (totalSpent >= 2000) return 0.8;
    if (totalSpent >= 1000) return 0.6;
    if (totalSpent >= 500) return 0.4;
    return 0.3;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
