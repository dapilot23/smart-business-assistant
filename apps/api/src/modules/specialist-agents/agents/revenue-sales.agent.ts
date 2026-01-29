import { AgentType, InsightPriority, Quote } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { AiEngineService } from '../../ai-engine/ai-engine.service';
import { BaseAgent, AgentInsightInput, AgentRunContext } from './base-agent';

interface QuoteWithContext extends Quote {
  customer: {
    name: string;
    email: string | null;
    phone: string;
    context: {
      totalVisits: number;
      totalSpent: Decimal;
      lastInteraction: Date | null;
    } | null;
  };
}

interface AiAnalysisResult {
  conversionLikelihood: number;
  urgencyScore: number;
  recommendedAction: string;
  suggestedDiscount: number;
  optimalFollowUpTime: string;
  reasoning: string;
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

  protected async fetchEntities(tenantId: string): Promise<QuoteWithContext[]> {
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
          select: {
            name: true,
            email: true,
            phone: true,
            context: {
              select: {
                totalVisits: true,
                totalSpent: true,
                lastInteraction: true,
              },
            },
          },
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
    const quote = entity as QuoteWithContext;
    const insights: AgentInsightInput[] = [];

    const daysSinceSent = quote.sentAt
      ? Math.floor((Date.now() - quote.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Skip quotes that are too new (less than 1 day old)
    if (daysSinceSent !== null && daysSinceSent < 1) {
      return insights;
    }

    // Try AI analysis if available
    if (this.aiEngine.isReady()) {
      const aiInsight = await this.analyzeWithAi(quote, context);
      if (aiInsight) {
        insights.push(aiInsight);
        return insights;
      }
    }

    // Fallback to rule-based analysis
    return this.analyzeWithRules(quote);
  }

  private async analyzeWithAi(
    quote: QuoteWithContext,
    context: AgentRunContext,
  ): Promise<AgentInsightInput | null> {
    const daysSinceSent = quote.sentAt
      ? Math.floor((Date.now() - quote.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const daysSinceLastInteraction = quote.customer.context?.lastInteraction
      ? Math.floor(
          (Date.now() - quote.customer.context.lastInteraction.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    try {
      const result = await this.aiEngine.generateText({
        template: 'agent.revenue-quote-analysis',
        variables: {
          quoteNumber: quote.quoteNumber,
          quoteAmount: `$${Number(quote.amount).toFixed(2)}`,
          serviceType: quote.description,
          daysSinceSent: daysSinceSent.toString(),
          viewedStatus: quote.viewedAt ? 'Viewed' : 'Not viewed',
          validUntil: quote.validUntil.toLocaleDateString(),
          customerName: quote.customer.name,
          totalVisits: (quote.customer.context?.totalVisits ?? 0).toString(),
          totalSpent: `$${Number(quote.customer.context?.totalSpent ?? 0).toFixed(2)}`,
          daysSinceLastInteraction: daysSinceLastInteraction?.toString() ?? 'unknown',
        },
        tenantId: context.tenantId,
        feature: 'agent-revenue-sales',
      });

      this.trackTokens(result.inputTokens, result.outputTokens);

      const analysis = this.parseAiResponse(result.data);
      if (!analysis) return null;

      // Only create insight if action is recommended
      if (analysis.recommendedAction === 'wait') return null;

      const confidence = analysis.conversionLikelihood;
      const impact = analysis.urgencyScore;

      return {
        entityType: 'quote',
        entityId: quote.id,
        insightType: this.mapActionToInsightType(analysis.recommendedAction),
        title: this.generateTitle(quote, analysis),
        description: this.generateDescription(quote, analysis),
        confidenceScore: confidence,
        impactScore: impact,
        priority: this.calculatePriority(confidence, impact),
        recommendedAction: this.mapActionToRecommendation(analysis, quote),
        actionParams: {
          quoteId: quote.id,
          customerId: quote.customerId,
          phone: quote.customer.phone,
          email: quote.customer.email,
          suggestedDiscount: analysis.suggestedDiscount,
        },
        actionLabel: this.mapActionToLabel(analysis.recommendedAction),
        expiresAt: this.calculateExpiry(analysis.optimalFollowUpTime),
        aiReasoning: analysis.reasoning,
      };
    } catch (error) {
      this.logger.warn(`AI analysis failed for quote ${quote.id}`, error);
      return null;
    }
  }

  private analyzeWithRules(quote: QuoteWithContext): AgentInsightInput[] {
    const insights: AgentInsightInput[] = [];

    const daysSinceSent = quote.sentAt
      ? Math.floor((Date.now() - quote.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const daysSinceViewed = quote.viewedAt
      ? Math.floor((Date.now() - quote.viewedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Quote viewed but not converted
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
            `(${this.formatCurrency(Number(quote.amount))}) ${daysSinceViewed} day(s) ago.`,
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
          aiReasoning: 'Quotes convert best within 1-3 days of being viewed.',
        });
      }
    }

    // Quote sent but never viewed
    if (quote.sentAt && !quote.viewedAt && daysSinceSent !== null && daysSinceSent >= 2) {
      insights.push({
        entityType: 'quote',
        entityId: quote.id,
        insightType: 'unopened_quote',
        title: `Resend quote to ${quote.customer.name}`,
        description:
          `Quote #${quote.quoteNumber} sent ${daysSinceSent} days ago hasn't been opened.`,
        confidenceScore: 0.7,
        impactScore: 0.5,
        priority: InsightPriority.MEDIUM,
        recommendedAction: `Resend quote or call ${quote.customer.name}`,
        actionParams: {
          quoteId: quote.id,
          customerId: quote.customerId,
          email: quote.customer.email,
        },
        actionLabel: 'Resend Quote',
        expiresAt: this.addDays(new Date(), 5),
        aiReasoning: 'Email may have been missed. A follow-up increases visibility.',
      });
    }

    // High-value quote aging
    if (Number(quote.amount) >= 1000 && daysSinceSent !== null && daysSinceSent >= 5) {
      insights.push({
        entityType: 'quote',
        entityId: quote.id,
        insightType: 'high_value_aging',
        title: `High-value quote needs attention`,
        description:
          `Quote #${quote.quoteNumber} for ${this.formatCurrency(Number(quote.amount))} ` +
          `is ${daysSinceSent} days old without conversion.`,
        confidenceScore: 0.75,
        impactScore: 0.85,
        priority: InsightPriority.HIGH,
        recommendedAction: 'Offer discount or schedule consultation call',
        actionParams: {
          quoteId: quote.id,
          customerId: quote.customerId,
          suggestedDiscount: 10,
        },
        actionLabel: 'Apply Discount',
        expiresAt: this.addDays(new Date(), 7),
        aiReasoning: 'High-value quotes need proactive follow-up.',
      });
    }

    return insights;
  }

  private parseAiResponse(response: string): AiAnalysisResult | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  private mapActionToInsightType(action: string): string {
    const mapping: Record<string, string> = {
      call_immediately: 'follow_up_urgency',
      send_followup: 'follow_up_needed',
      offer_discount: 'discount_opportunity',
      mark_cold: 'quote_cold',
    };
    return mapping[action] ?? 'follow_up_needed';
  }

  private generateTitle(quote: QuoteWithContext, analysis: AiAnalysisResult): string {
    const actions: Record<string, string> = {
      call_immediately: `Call ${quote.customer.name} now - high conversion chance`,
      send_followup: `Follow up with ${quote.customer.name}`,
      offer_discount: `Offer discount to ${quote.customer.name}`,
      mark_cold: `Quote #${quote.quoteNumber} going cold`,
    };
    return actions[analysis.recommendedAction] ?? `Review quote for ${quote.customer.name}`;
  }

  private generateDescription(quote: QuoteWithContext, analysis: AiAnalysisResult): string {
    return (
      `Quote #${quote.quoteNumber} for ${this.formatCurrency(Number(quote.amount))} ` +
      `has ${Math.round(analysis.conversionLikelihood * 100)}% conversion likelihood. ` +
      analysis.reasoning
    );
  }

  private mapActionToRecommendation(
    analysis: AiAnalysisResult,
    quote: QuoteWithContext,
  ): string {
    if (analysis.recommendedAction === 'offer_discount' && analysis.suggestedDiscount > 0) {
      return `Offer ${analysis.suggestedDiscount}% discount to ${quote.customer.name}`;
    }
    const actions: Record<string, string> = {
      call_immediately: `Call ${quote.customer.name} immediately`,
      send_followup: `Send follow-up email to ${quote.customer.name}`,
      offer_discount: `Offer discount to secure the deal`,
      mark_cold: 'Consider archiving or final follow-up attempt',
    };
    return actions[analysis.recommendedAction] ?? 'Review and follow up';
  }

  private mapActionToLabel(action: string): string {
    const labels: Record<string, string> = {
      call_immediately: 'Call Now',
      send_followup: 'Send Follow-up',
      offer_discount: 'Apply Discount',
      mark_cold: 'Archive',
    };
    return labels[action] ?? 'Take Action';
  }

  private calculateExpiry(followUpTime: string): Date {
    const now = new Date();
    switch (followUpTime) {
      case 'immediate':
        return this.addDays(now, 1);
      case 'today':
        return this.addDays(now, 1);
      case 'tomorrow':
        return this.addDays(now, 2);
      case 'this_week':
        return this.addDays(now, 7);
      default:
        return this.addDays(now, 3);
    }
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
