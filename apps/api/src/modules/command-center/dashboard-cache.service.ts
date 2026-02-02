import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CacheService, CACHE_TTL } from '../../config/cache/cache.service';
import { TaskLedgerService } from '../task-ledger/task-ledger.service';
import {
  DashboardCache,
  StatusBarData,
  DashboardMetrics,
  Signal,
  SignalType,
  DASHBOARD_CACHE_KEYS,
} from './types';

@Injectable()
export class DashboardCacheService {
  private readonly logger = new Logger(DashboardCacheService.name);
  private readonly TTL = CACHE_TTL.SHORT; // 30 seconds

  constructor(
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
    private readonly taskLedger: TaskLedgerService,
  ) {}

  /**
   * Get dashboard data (cached or fresh)
   */
  async getDashboardData(tenantId: string): Promise<DashboardCache> {
    const cacheKey = DASHBOARD_CACHE_KEYS.DASHBOARD(tenantId);

    return this.cache.wrap<DashboardCache>(
      cacheKey,
      () => this.calculateDashboardData(tenantId),
      this.TTL,
    );
  }

  /**
   * Force refresh dashboard data
   */
  async refreshDashboardData(tenantId: string): Promise<DashboardCache> {
    await this.invalidate(tenantId);
    return this.getDashboardData(tenantId);
  }

  /**
   * Invalidate dashboard cache for a tenant
   */
  async invalidate(tenantId: string): Promise<void> {
    const cacheKey = DASHBOARD_CACHE_KEYS.DASHBOARD(tenantId);
    await this.cache.del(cacheKey);
    this.logger.debug(`Invalidated dashboard cache for tenant ${tenantId}`);
  }

  /**
   * Calculate fresh dashboard data
   */
  private async calculateDashboardData(tenantId: string): Promise<DashboardCache> {
    this.logger.debug(`Calculating dashboard data for tenant ${tenantId}`);

    const [taskStats, statusBar, metrics, signals] = await Promise.all([
      this.taskLedger.getTaskStats(tenantId),
      this.calculateStatusBar(tenantId),
      this.calculateMetrics(tenantId),
      this.calculateSignals(tenantId),
    ]);

    return {
      statusBar,
      taskStats,
      signals,
      metrics,
      cachedAt: new Date(),
    };
  }

  /**
   * Calculate status bar data
   */
  private async calculateStatusBar(tenantId: string): Promise<StatusBarData> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAppointments, outstandingInvoices] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          tenantId,
          scheduledAt: { gte: today, lt: tomorrow },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: { in: ['SENT', 'OVERDUE'] },
        },
        _sum: { amount: true },
      }),
    ]);

    const outstandingAmount = outstandingInvoices._sum?.amount?.toNumber() || 0;
    const greeting = this.getGreeting();

    // Placeholder for Business Pulse score (will be implemented later)
    const businessPulseScore = 75;
    const trend = 'stable' as const;

    return {
      greeting,
      todayAppointments,
      outstandingAmount,
      businessPulseScore,
      trend,
    };
  }

  /**
   * Calculate dashboard metrics
   */
  private async calculateMetrics(tenantId: string): Promise<DashboardMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [
      todayPayments,
      weekAppointments,
      weekPayments,
      overdueInvoices,
      unconfirmedAppts,
      pendingQuotes,
    ] = await Promise.all([
      // Today's revenue
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          paidAt: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),

      // Week appointments
      this.prisma.appointment.count({
        where: {
          tenantId,
          scheduledAt: { gte: weekStart },
          status: { notIn: ['CANCELLED'] },
        },
      }),

      // Week revenue
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          paidAt: { gte: weekStart },
        },
        _sum: { amount: true },
      }),

      // Overdue invoices
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: 'OVERDUE',
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Unconfirmed appointments (today and tomorrow)
      this.prisma.appointment.count({
        where: {
          tenantId,
          status: 'SCHEDULED',
          confirmedAt: null,
          scheduledAt: {
            gte: today,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Pending quotes
      this.prisma.quote.aggregate({
        where: {
          tenantId,
          status: 'SENT',
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      todayRevenue: todayPayments._sum?.amount?.toNumber() || 0,
      todayRevenueTarget: 1000, // Placeholder - could be from settings
      weekAppointments,
      weekRevenue: weekPayments._sum?.amount?.toNumber() || 0,
      overdueInvoicesCount: overdueInvoices._count || 0,
      overdueInvoicesAmount: overdueInvoices._sum?.amount?.toNumber() || 0,
      unconfirmedAppointments: unconfirmedAppts,
      pendingQuotesCount: pendingQuotes._count || 0,
      pendingQuotesAmount: pendingQuotes._sum?.amount?.toNumber() || 0,
    };
  }

  /**
   * Calculate attention signals
   */
  private async calculateSignals(tenantId: string): Promise<Signal[]> {
    const signals: Signal[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Signal 1: Unconfirmed appointments for today
    const unconfirmedToday = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: 'SCHEDULED',
        confirmedAt: null,
        scheduledAt: { gte: today, lt: tomorrow },
      },
      include: { customer: true },
      take: 5,
    });

    if (unconfirmedToday.length > 0) {
      signals.push({
        id: `signal-unconfirmed-${Date.now()}`,
        type: SignalType.WARNING,
        icon: 'calendar-alert',
        title: 'Unconfirmed appointments',
        detail: `${unconfirmedToday.length} appointment${unconfirmedToday.length > 1 ? 's' : ''} today not confirmed`,
        count: unconfirmedToday.length,
        priority: 'high',
        action: {
          label: 'Send confirmations',
          endpoint: '/appointments/bulk-confirm',
          method: 'POST',
          payload: { appointmentIds: unconfirmedToday.map((a) => a.id) },
        },
        createdAt: new Date(),
      });
    }

    // Signal 2: Overdue invoices
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: 'OVERDUE',
      },
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce(
        (sum, inv) => sum + (inv.amount?.toNumber() || 0),
        0,
      );
      signals.push({
        id: `signal-overdue-${Date.now()}`,
        type: SignalType.WARNING,
        icon: 'dollar-alert',
        title: 'Overdue invoices',
        detail: `$${totalOverdue.toFixed(0)} across ${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? 's' : ''}`,
        count: overdueInvoices.length,
        amount: totalOverdue,
        priority: 'high',
        action: {
          label: 'Send reminders',
          endpoint: '/invoices/bulk-remind',
          method: 'POST',
          payload: { invoiceIds: overdueInvoices.map((i) => i.id) },
        },
        createdAt: new Date(),
      });
    }

    // Signal 3: Quotes waiting for follow-up
    const staleQuotes = await this.prisma.quote.findMany({
      where: {
        tenantId,
        status: 'SENT',
        createdAt: {
          lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3+ days old
        },
      },
      include: { customer: true },
      orderBy: { amount: 'desc' },
      take: 5,
    });

    if (staleQuotes.length > 0) {
      const totalPending = staleQuotes.reduce(
        (sum, q) => sum + (q.amount?.toNumber() || 0),
        0,
      );
      signals.push({
        id: `signal-quotes-${Date.now()}`,
        type: SignalType.OPPORTUNITY,
        icon: 'file-text',
        title: 'Quotes need follow-up',
        detail: `$${totalPending.toFixed(0)} in pending quotes over 3 days old`,
        count: staleQuotes.length,
        amount: totalPending,
        priority: 'medium',
        action: {
          label: 'Follow up',
          endpoint: '/quotes/bulk-follow-up',
          method: 'POST',
          payload: { quoteIds: staleQuotes.map((q) => q.id) },
        },
        createdAt: new Date(),
      });
    }

    // Signal 4: Recent positive reviews
    const recentReviews = await this.prisma.reviewRequest.findMany({
      where: {
        tenantId,
        status: 'CLICKED',
        clickedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      take: 3,
    });

    if (recentReviews.length > 0) {
      signals.push({
        id: `signal-reviews-${Date.now()}`,
        type: SignalType.SUCCESS,
        icon: 'star',
        title: 'New review activity',
        detail: `${recentReviews.length} customer${recentReviews.length > 1 ? 's' : ''} clicked review link`,
        count: recentReviews.length,
        priority: 'low',
        createdAt: new Date(),
      });
    }

    // Sort by priority (high first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return signals.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }

  /**
   * Get time-based greeting
   */
  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // ============================================
  // Event handlers for cache invalidation
  // ============================================

  @OnEvent('appointment.*')
  async onAppointmentEvent(payload: { tenantId: string }): Promise<void> {
    if (payload.tenantId) {
      await this.invalidate(payload.tenantId);
    }
  }

  @OnEvent('invoice.*')
  async onInvoiceEvent(payload: { tenantId: string }): Promise<void> {
    if (payload.tenantId) {
      await this.invalidate(payload.tenantId);
    }
  }

  @OnEvent('quote.*')
  async onQuoteEvent(payload: { tenantId: string }): Promise<void> {
    if (payload.tenantId) {
      await this.invalidate(payload.tenantId);
    }
  }

  @OnEvent('task_ledger.*')
  async onTaskLedgerEvent(payload: { tenantId: string }): Promise<void> {
    if (payload.tenantId) {
      await this.invalidate(payload.tenantId);
    }
  }

  @OnEvent('payment.*')
  async onPaymentEvent(payload: { tenantId: string }): Promise<void> {
    if (payload.tenantId) {
      await this.invalidate(payload.tenantId);
    }
  }

  @OnEvent('review.*')
  async onReviewEvent(payload: { tenantId: string }): Promise<void> {
    if (payload.tenantId) {
      await this.invalidate(payload.tenantId);
    }
  }
}
