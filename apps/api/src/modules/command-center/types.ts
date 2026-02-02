/**
 * Command Center Types
 * Defines the data structures for the Command Center dashboard
 */

export interface DashboardCache {
  // Status bar data
  statusBar: StatusBarData;

  // Task statistics
  taskStats: TaskStatsData;

  // Signals requiring attention
  signals: Signal[];

  // Quick metrics
  metrics: DashboardMetrics;

  // Cache metadata
  cachedAt: Date;
}

export interface StatusBarData {
  greeting: string;
  todayAppointments: number;
  outstandingAmount: number;
  businessPulseScore: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TaskStatsData {
  pending: number;
  approvals: number;
  completedToday: number;
  failedToday: number;
}

export interface DashboardMetrics {
  // Today's revenue
  todayRevenue: number;
  todayRevenueTarget: number;

  // Week stats
  weekAppointments: number;
  weekRevenue: number;

  // Overdue items
  overdueInvoicesCount: number;
  overdueInvoicesAmount: number;

  // Unconfirmed appointments
  unconfirmedAppointments: number;

  // Pending quotes
  pendingQuotesCount: number;
  pendingQuotesAmount: number;
}

export interface Signal {
  id: string;
  type: SignalType;
  icon: string;
  title: string;
  detail: string;
  count?: number;
  amount?: number;
  priority: 'high' | 'medium' | 'low';
  action?: SignalAction;
  createdAt: Date;
}

export enum SignalType {
  WARNING = 'WARNING',
  OPPORTUNITY = 'OPPORTUNITY',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
}

export interface SignalAction {
  label: string;
  endpoint: string;
  method: 'GET' | 'POST';
  payload?: Record<string, unknown>;
}

export interface OneTapWin {
  id: string;
  headline: string;
  subtext: string;
  impact: {
    revenue?: number;
    label: string;
  };
  action: SignalAction;
  entityType?: string;
  entityId?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  endpoint: string;
  method: 'GET' | 'POST';
  payload?: Record<string, unknown>;
  confirmation?: string;
}

// Full Command Center dashboard response
export interface CommandCenterDashboard {
  statusBar: StatusBarData;
  taskStats: TaskStatsData;
  metrics: DashboardMetrics;
  approvals: ApprovalItem[];
  tasks: TaskItem[];
  signals: Signal[];
  oneTapWin: OneTapWin | null;
  quickActions: QuickAction[];
  cachedAt: Date;
}

export interface ApprovalItem {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  entityType?: string;
  entityId?: string;
  aiConfidence?: number;
  aiReasoning?: string;
  category: string;
  priority: number;
  createdAt: Date;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  status: string;
  category: string;
  priority: number;
  entityType?: string;
  entityId?: string;
  scheduledFor?: Date;
  createdAt: Date;
}

// Cache key helpers
export const DASHBOARD_CACHE_KEYS = {
  DASHBOARD: (tenantId: string) => `dashboard:${tenantId}:main`,
  SIGNALS: (tenantId: string) => `dashboard:${tenantId}:signals`,
  ONE_TAP_WIN: (tenantId: string) => `dashboard:${tenantId}:one-tap-win`,
  METRICS: (tenantId: string) => `dashboard:${tenantId}:metrics`,
};
