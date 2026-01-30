import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { Prisma } from '@prisma/client';

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  actionType: string;
  actionLabel: string;
  actionParams: Record<string, unknown>;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedImpact?: string;
  icon?: string;
}

export interface SuggestionsResponse {
  context: string;
  suggestions: Suggestion[];
  generatedAt: string;
  expiresAt: string;
}

type ContextHandler = (tenantId: string) => Promise<Suggestion[]>;

@Injectable()
export class AiSuggestionsService {
  private readonly logger = new Logger(AiSuggestionsService.name);
  private readonly CACHE_TTL_MINUTES = 15;

  private readonly contextHandlers: Record<string, ContextHandler> = {
    marketing_empty: this.handleMarketingEmpty.bind(this),
    marketing_page: this.handleMarketingPage.bind(this),
    customer_detail: this.handleCustomerDetail.bind(this),
    customers_list: this.handleCustomersList.bind(this),
    quotes_page: this.handleQuotesPage.bind(this),
    dashboard: this.handleDashboard.bind(this),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
  ) {}

  async getSuggestions(
    tenantId: string,
    context: string,
    entityId?: string,
  ): Promise<SuggestionsResponse> {
    // Check cache first
    const cached = await this.getCachedSuggestions(tenantId, context);
    if (cached) {
      return cached;
    }

    // Generate new suggestions
    const handler = this.contextHandlers[context];
    if (!handler) {
      this.logger.warn(`No handler for context: ${context}`);
      return this.emptyResponse(context);
    }

    try {
      const suggestions = await handler(tenantId);
      const response = this.buildResponse(context, suggestions);

      // Cache the response
      await this.cacheSuggestions(tenantId, context, response);

      return response;
    } catch (error) {
      this.logger.error(`Failed to generate suggestions for ${context}: ${error}`);
      return this.emptyResponse(context);
    }
  }

  async invalidateCache(tenantId: string, context?: string): Promise<void> {
    if (context) {
      await this.prisma.contextualSuggestion.deleteMany({
        where: { tenantId, context },
      });
    } else {
      await this.prisma.contextualSuggestion.deleteMany({
        where: { tenantId },
      });
    }
  }

  // ========================================
  // Context Handlers
  // ========================================

  private async handleMarketingEmpty(tenantId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Check for dormant customers
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const dormantCustomers = await this.prisma.customer.count({
      where: {
        tenantId,
        context: {
          lastInteraction: { lt: ninetyDaysAgo },
        },
      },
    });

    if (dormantCustomers > 0) {
      suggestions.push({
        id: `win-back-${Date.now()}`,
        title: `Win back ${dormantCustomers} dormant customers`,
        description: `These customers haven't visited in 90+ days. A targeted campaign could bring them back.`,
        actionType: 'CREATE_CAMPAIGN',
        actionLabel: 'Create Win-Back Campaign',
        actionParams: {
          name: 'Win-Back Campaign',
          type: 'SMS_BLAST',
          targetSegment: 'dormant_90_days',
          suggestedMessage: `We miss you! It's been a while since your last visit. Book now and get 15% off your next service.`,
        },
        priority: 'HIGH',
        estimatedImpact: `Reach ${dormantCustomers} customers`,
        icon: 'users',
      });
    }

    // Check recent completed jobs for referral opportunity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJobs = await this.prisma.job.count({
      where: {
        tenantId,
        status: 'COMPLETED',
        completedAt: { gte: thirtyDaysAgo },
      },
    });

    if (recentJobs >= 5) {
      suggestions.push({
        id: `referral-${Date.now()}`,
        title: 'Start a referral program',
        description: `You've completed ${recentJobs} jobs this month. Happy customers are your best marketers!`,
        actionType: 'CREATE_CAMPAIGN',
        actionLabel: 'Create Referral Campaign',
        actionParams: {
          name: 'Referral Program',
          type: 'REFERRAL',
          suggestedMessage: `Love our service? Refer a friend and you both get $25 off your next booking!`,
        },
        priority: 'MEDIUM',
        estimatedImpact: 'Potential 2-3x customer growth',
        icon: 'gift',
      });
    }

    // Suggest seasonal campaign if no campaigns exist
    const existingCampaigns = await this.prisma.marketingCampaign.count({
      where: { tenantId, status: { not: 'COMPLETED' } },
    });

    if (existingCampaigns === 0) {
      const month = new Date().toLocaleString('default', { month: 'long' });
      suggestions.push({
        id: `seasonal-${Date.now()}`,
        title: `Launch a ${month} promotion`,
        description: 'Seasonal promotions drive bookings. Create your first campaign to reach customers.',
        actionType: 'CREATE_CAMPAIGN',
        actionLabel: 'Create Seasonal Campaign',
        actionParams: {
          name: `${month} Special`,
          type: 'SEASONAL',
          suggestedMessage: `${month} Special! Book this week and save 10% on any service.`,
        },
        priority: 'MEDIUM',
        estimatedImpact: 'Boost monthly bookings',
        icon: 'calendar',
      });
    }

    return suggestions;
  }

  private async handleMarketingPage(tenantId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Check segment opportunities
    const atRiskCustomers = await this.prisma.customer.count({
      where: { tenantId, churnRisk: { gte: 0.7 } },
    });

    if (atRiskCustomers > 0) {
      suggestions.push({
        id: `at-risk-segment-${Date.now()}`,
        title: `Create at-risk customer segment`,
        description: `${atRiskCustomers} customers show high churn risk. Target them with retention offers.`,
        actionType: 'CREATE_SEGMENT',
        actionLabel: 'Create Segment',
        actionParams: {
          name: 'At-Risk Customers',
          description: 'Customers with high churn risk',
          rules: {
            conditions: [{ field: 'churnRisk', operator: 'gte', value: 0.7 }],
            logic: 'AND',
          },
        },
        priority: 'HIGH',
        estimatedImpact: `Identify ${atRiskCustomers} at-risk customers`,
        icon: 'alert',
      });
    }

    // Check for VIP segment opportunity
    const highValueCustomers = await this.prisma.customer.count({
      where: {
        tenantId,
        context: { totalSpent: { gte: 1000 } },
      },
    });

    if (highValueCustomers >= 5) {
      suggestions.push({
        id: `vip-segment-${Date.now()}`,
        title: 'Create VIP customer segment',
        description: `${highValueCustomers} customers have spent $1000+. Reward their loyalty!`,
        actionType: 'CREATE_SEGMENT',
        actionLabel: 'Create VIP Segment',
        actionParams: {
          name: 'VIP Customers',
          description: 'High-value customers ($1000+ lifetime spend)',
          rules: {
            conditions: [{ field: 'totalSpent', operator: 'gte', value: 1000 }],
            logic: 'AND',
          },
        },
        priority: 'MEDIUM',
        estimatedImpact: 'Improve retention of top customers',
        icon: 'star',
      });
    }

    return suggestions;
  }

  private async handleCustomerDetail(tenantId: string): Promise<Suggestion[]> {
    // This would typically receive an entityId (customerId) for specific suggestions
    // For now, return general customer-related suggestions
    return [];
  }

  private async handleCustomersList(tenantId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Check for customers without recent contact
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const needsFollowUp = await this.prisma.customer.count({
      where: {
        tenantId,
        context: {
          lastInteraction: { lt: sixtyDaysAgo },
        },
      },
    });

    if (needsFollowUp > 0) {
      suggestions.push({
        id: `followup-${Date.now()}`,
        title: `${needsFollowUp} customers need follow-up`,
        description: 'These customers haven\'t been contacted in 60+ days.',
        actionType: 'SEND_SMS',
        actionLabel: 'Send Check-in Messages',
        actionParams: {
          targetCount: needsFollowUp,
          suggestedMessage: 'Hi! Just checking in - is there anything we can help you with?',
        },
        priority: 'MEDIUM',
        estimatedImpact: 'Re-engage inactive customers',
        icon: 'message',
      });
    }

    return suggestions;
  }

  private async handleQuotesPage(tenantId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Check for aging quotes
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const agingQuotes = await this.prisma.quote.findMany({
      where: {
        tenantId,
        status: 'SENT',
        sentAt: { lt: sevenDaysAgo },
      },
      include: { customer: true },
      take: 5,
    });

    if (agingQuotes.length > 0) {
      const totalValue = agingQuotes.reduce(
        (sum, q) => sum + ((q as any).amount?.toNumber?.() || 0),
        0,
      );

      suggestions.push({
        id: `aging-quotes-${Date.now()}`,
        title: `${agingQuotes.length} quotes need follow-up`,
        description: `$${totalValue.toLocaleString()} in quotes are 7+ days old without response.`,
        actionType: 'SCHEDULE_FOLLOW_UP',
        actionLabel: 'Schedule Follow-ups',
        actionParams: {
          quoteIds: agingQuotes.map((q) => q.id),
          suggestedAction: 'call',
        },
        priority: 'HIGH',
        estimatedImpact: `Recover $${totalValue.toLocaleString()} in potential revenue`,
        icon: 'phone',
      });
    }

    return suggestions;
  }

  private async handleDashboard(tenantId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Check for today's appointments needing confirmation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const unconfirmedToday = await this.prisma.appointment.count({
      where: {
        tenantId,
        scheduledAt: { gte: today, lt: tomorrow },
        status: 'SCHEDULED',
      },
    });

    if (unconfirmedToday > 0) {
      suggestions.push({
        id: `confirm-appts-${Date.now()}`,
        title: `Confirm ${unconfirmedToday} appointments`,
        description: 'Unconfirmed appointments have higher no-show rates.',
        actionType: 'SEND_SMS',
        actionLabel: 'Send Confirmations',
        actionParams: {
          type: 'appointment_confirmation',
          targetDate: today.toISOString(),
        },
        priority: 'HIGH',
        estimatedImpact: 'Reduce no-shows by up to 30%',
        icon: 'calendar-check',
      });
    }

    // Check for overdue invoices
    const overdueInvoices = await this.prisma.invoice.count({
      where: {
        tenantId,
        status: 'OVERDUE',
      },
    });

    if (overdueInvoices > 0) {
      suggestions.push({
        id: `overdue-invoices-${Date.now()}`,
        title: `${overdueInvoices} overdue invoices`,
        description: 'Send payment reminders to improve cash flow.',
        actionType: 'SEND_EMAIL',
        actionLabel: 'Send Reminders',
        actionParams: {
          type: 'payment_reminder',
        },
        priority: 'MEDIUM',
        estimatedImpact: 'Improve collection rate',
        icon: 'dollar',
      });
    }

    return suggestions;
  }

  // ========================================
  // Cache Helpers
  // ========================================

  private async getCachedSuggestions(
    tenantId: string,
    context: string,
  ): Promise<SuggestionsResponse | null> {
    const cached = await this.prisma.contextualSuggestion.findUnique({
      where: { tenantId_context: { tenantId, context } },
    });

    if (!cached || cached.validUntil < new Date()) {
      return null;
    }

    return cached.suggestions as unknown as SuggestionsResponse;
  }

  private async cacheSuggestions(
    tenantId: string,
    context: string,
    response: SuggestionsResponse,
  ): Promise<void> {
    const validUntil = new Date();
    validUntil.setMinutes(validUntil.getMinutes() + this.CACHE_TTL_MINUTES);

    await this.prisma.contextualSuggestion.upsert({
      where: { tenantId_context: { tenantId, context } },
      update: {
        suggestions: response as unknown as Prisma.InputJsonValue,
        validUntil,
      },
      create: {
        tenantId,
        context,
        suggestions: response as unknown as Prisma.InputJsonValue,
        validUntil,
      },
    });
  }

  private buildResponse(context: string, suggestions: Suggestion[]): SuggestionsResponse {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CACHE_TTL_MINUTES);

    return {
      context,
      suggestions,
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private emptyResponse(context: string): SuggestionsResponse {
    return this.buildResponse(context, []);
  }
}
