import { AgentType, InsightPriority, Quote } from '@prisma/client';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { AiEngineService } from '../../ai-engine/ai-engine.service';
import { BaseAgent, AgentInsightInput, AgentRunContext } from './base-agent';

interface QuoteWithCustomer extends Quote {
  customer: { name: string; email: string | null; phone: string };
}

export class RevenueSalesAgent extends BaseAgent {
  constructor(prisma: PrismaService, aiEngine: AiEngineService) {
    super(prisma, aiEngine, AgentType.REVENUE_SALES);
  }

  getName(): string {
    return 'Revenue & Sales Agent';
  }

  getDescription(): string {
    return 'Analyzes quotes for conversion opportunities and follow-up timing';
  }

  protected async fetchEntities(tenantId: string): Promise<QuoteWithCustomer[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.quote.findMany({
      where: {
        tenantId,
        status: { in: ['SENT', 'DRAFT'] },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        customer: {
          select: { name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  protected async analyzeEntity(
    entity: unknown,
    context: AgentRunContext,
  ): Promise<AgentInsightInput[]> {
    const quote = entity as QuoteWithCustomer;
    const insights: AgentInsightInput[] = [];

    const daysSinceSent = quote.sentAt
      ? Math.floor((Date.now() - quote.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const daysSinceViewed = quote.viewedAt
      ? Math.floor((Date.now() - quote.viewedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Insight: Quote viewed but not converted
    if (quote.viewedAt && !quote.convertedAt && daysSinceViewed !== null) {
      if (daysSinceViewed >= 1 && daysSinceViewed <= 3) {
        const confidence = 0.85;
        const impact = Number(quote.amount) > 500 ? 0.9 : 0.6;
        insights.push({
          entityType: 'quote',
          entityId: quote.id,
          insightType: 'follow_up_urgency',
          title: `Follow up with ${quote.customer.name} - quote viewed`,
          description:
            `${quote.customer.name} viewed quote #${quote.quoteNumber} ` +
            `(${this.formatCurrency(Number(quote.amount))}) ${daysSinceViewed} day(s) ago. ` +
            `This is the optimal window for follow-up.`,
          confidenceScore: confidence,
          impactScore: impact,
          priority: this.calculatePriority(confidence, impact),
          recommendedAction: `Call ${quote.customer.name} to discuss the quote`,
          actionParams: {
            quoteId: quote.id,
            customerId: quote.customerId,
            phone: quote.customer.phone,
          },
          actionLabel: 'Call Now',
          expiresAt: this.addDays(new Date(), 3),
          aiReasoning:
            'Quotes are most likely to convert within 1-3 days of being viewed. ' +
            'Following up during this window shows attentiveness.',
        });
      }
    }

    // Insight: Quote sent but never viewed
    if (quote.sentAt && !quote.viewedAt && daysSinceSent !== null && daysSinceSent >= 2) {
      const confidence = 0.7;
      const impact = 0.5;
      insights.push({
        entityType: 'quote',
        entityId: quote.id,
        insightType: 'unopened_quote',
        title: `Resend quote to ${quote.customer.name}`,
        description:
          `Quote #${quote.quoteNumber} was sent ${daysSinceSent} days ago ` +
          `but hasn't been opened. Consider resending or following up via phone.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: InsightPriority.MEDIUM,
        recommendedAction: `Resend quote or call ${quote.customer.name}`,
        actionParams: {
          quoteId: quote.id,
          customerId: quote.customerId,
          email: quote.customer.email,
        },
        actionLabel: 'Resend Quote',
        expiresAt: this.addDays(new Date(), 5),
        aiReasoning:
          'Email may have gone to spam or been missed. A follow-up increases visibility.',
      });
    }

    // Insight: High-value quote aging
    if (Number(quote.amount) >= 1000 && daysSinceSent !== null && daysSinceSent >= 5) {
      const confidence = 0.75;
      const impact = 0.85;
      insights.push({
        entityType: 'quote',
        entityId: quote.id,
        insightType: 'high_value_aging',
        title: `High-value quote needs attention`,
        description:
          `Quote #${quote.quoteNumber} for ${this.formatCurrency(Number(quote.amount))} ` +
          `is ${daysSinceSent} days old without conversion. ` +
          `Consider offering a discount or scheduling a call.`,
        confidenceScore: confidence,
        impactScore: impact,
        priority: InsightPriority.HIGH,
        recommendedAction: 'Offer 10% discount or schedule consultation call',
        actionParams: {
          quoteId: quote.id,
          customerId: quote.customerId,
          suggestedDiscount: 10,
        },
        actionLabel: 'Apply Discount',
        expiresAt: this.addDays(new Date(), 7),
        aiReasoning:
          'High-value quotes represent significant revenue opportunity. ' +
          'A small discount may trigger conversion.',
      });
    }

    return insights;
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
