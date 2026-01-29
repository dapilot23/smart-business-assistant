import { AgentType, InsightPriority, Customer } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { AiEngineService } from '../../ai-engine/ai-engine.service';
import { BaseAgent, AgentInsightInput, AgentRunContext } from './base-agent';

interface CustomerWithContext extends Customer {
  context: { totalSpent: Decimal; lastInteraction: Date | null } | null;
  _count: { appointments: number };
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
          select: { totalSpent: true, lastInteraction: true },
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

    const daysSinceLastInteraction = customer.context?.lastInteraction
      ? Math.floor(
          (Date.now() - new Date(customer.context.lastInteraction).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    // High churn risk detection
    if (customer.churnRisk >= 0.7) {
      const confidence = customer.churnRisk;
      const impact = this.calculateImpactFromSpend(
        Number(customer.context?.totalSpent ?? 0),
      );
      insights.push({
        entityType: 'customer',
        entityId: customer.id,
        insightType: 'churn_risk',
        title: `${customer.name} is at high churn risk`,
        description:
          `${customer.name} has a ${Math.round(customer.churnRisk * 100)}% churn risk. ` +
          `Last interaction was ${daysSinceLastInteraction ?? 'unknown'} days ago. ` +
          `Consider reaching out with a retention offer.`,
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
        aiReasoning:
          'High churn risk indicates the customer may not return. ' +
          'Proactive outreach with an incentive can re-engage them.',
      });
    }

    // Dormant customer re-engagement
    if (
      daysSinceLastInteraction !== null &&
      daysSinceLastInteraction >= 60 &&
      customer.lifecycleStage !== 'DORMANT'
    ) {
      const confidence = 0.8;
      const impact = 0.6;
      insights.push({
        entityType: 'customer',
        entityId: customer.id,
        insightType: 'dormant_customer',
        title: `Re-engage ${customer.name}`,
        description:
          `${customer.name} hasn't visited in ${daysSinceLastInteraction} days. ` +
          `They've had ${customer._count.appointments} appointments with you. ` +
          `Send a "We miss you" message.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: InsightPriority.MEDIUM,
        recommendedAction: 'Send re-engagement SMS',
        actionParams: {
          customerId: customer.id,
          phone: customer.phone,
          template: 'dormant_winback',
        },
        actionLabel: 'Send SMS',
        expiresAt: this.addDays(new Date(), 14),
        aiReasoning:
          'Customers who go dormant often need a reminder of your services. ' +
          'A friendly check-in can bring them back.',
      });
    }

    // VIP customer detection
    const totalSpent = Number(customer.context?.totalSpent ?? 0);
    if (totalSpent >= 2000 && customer.healthScore >= 80) {
      const confidence = 0.9;
      const impact = 0.7;
      insights.push({
        entityType: 'customer',
        entityId: customer.id,
        insightType: 'vip_customer',
        title: `${customer.name} is a VIP customer`,
        description:
          `${customer.name} has spent ${this.formatCurrency(totalSpent)} and ` +
          `has a health score of ${customer.healthScore}. ` +
          `Consider adding them to your VIP program.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: InsightPriority.LOW,
        recommendedAction: 'Add to VIP program and send thank you',
        actionParams: {
          customerId: customer.id,
          totalSpent,
        },
        actionLabel: 'Make VIP',
        expiresAt: this.addDays(new Date(), 30),
        aiReasoning:
          'VIP customers are your most valuable. ' +
          'Recognition and special treatment increases loyalty.',
      });
    }

    // No-show pattern detection
    if (customer.noShowCount >= 2) {
      const confidence = 0.85;
      const impact = 0.4;
      insights.push({
        entityType: 'customer',
        entityId: customer.id,
        insightType: 'noshow_pattern',
        title: `${customer.name} has a no-show pattern`,
        description:
          `${customer.name} has ${customer.noShowCount} no-shows. ` +
          `Consider requiring deposits for future bookings.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: InsightPriority.MEDIUM,
        recommendedAction: 'Enable deposit requirement for this customer',
        actionParams: {
          customerId: customer.id,
          noShowCount: customer.noShowCount,
        },
        actionLabel: 'Require Deposit',
        expiresAt: this.addDays(new Date(), 30),
        aiReasoning:
          'Customers with multiple no-shows cost you time and money. ' +
          'Deposits create accountability.',
      });
    }

    return insights;
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
