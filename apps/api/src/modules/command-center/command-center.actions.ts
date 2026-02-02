import { TaskActionType, TaskLedgerCategory, TaskLedgerType } from '../task-ledger/types';
import type { DashboardCache, OneTapWin, QuickAction } from './types';
const MAX_QUICK_ACTIONS = 4;
type TaskPayloadOptions = { title: string; description: string; category: TaskLedgerCategory; icon: string; actionType: TaskActionType; payload?: Record<string, unknown> };
type QuickActionOptions = TaskPayloadOptions & { id: string; label: string };
type ActionOptions = TaskPayloadOptions & { label: string };
export function buildQuickActions(cache: DashboardCache): QuickAction[] {
  const { metrics } = cache;
  const actions = [
    buildOverdueQuickAction(metrics),
    buildUnconfirmedQuickAction(metrics),
    buildPendingQuotesQuickAction(metrics),
    buildReviewRequestQuickAction(),
  ].filter((action): action is QuickAction => Boolean(action));
  return actions.slice(0, MAX_QUICK_ACTIONS);
}
export function buildOneTapWin(cache: DashboardCache): OneTapWin | null {
  const { metrics } = cache;
  return (
    buildOverdueWin(metrics) ??
    buildAppointmentsWin(metrics) ??
    buildQuotesWin(metrics)
  );
}
function buildQuickAction(options: QuickActionOptions): QuickAction {
  return {
    id: options.id,
    label: options.label,
    icon: options.icon,
    endpoint: '/task-ledger',
    method: 'POST',
    payload: buildTaskPayload(options),
    confirmation: `Run "${options.label}"?`,
  };
}
function buildAction(options: ActionOptions) {
  return {
    label: options.label,
    endpoint: '/task-ledger',
    method: 'POST' as const,
    payload: buildTaskPayload(options),
  };
}
function buildTaskPayload(options: TaskPayloadOptions) {
  return {
    type: TaskLedgerType.APPROVAL,
    category: options.category,
    title: options.title,
    description: options.description,
    icon: options.icon,
    actionType: options.actionType,
    payload: {
      source: 'command-center',
      ...options.payload,
    },
  };
}
function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString();
}
function buildOverdueQuickAction(metrics: DashboardCache['metrics']): QuickAction | null {
  if (metrics.overdueInvoicesCount <= 0) return null;
  return buildQuickAction({
    id: 'quick-overdue-invoices',
    label: 'Queue overdue reminders',
    icon: 'dollar-sign',
    title: 'Send overdue invoice reminders',
    description: `Follow up ${metrics.overdueInvoicesCount} overdue invoice(s).`,
    category: TaskLedgerCategory.BILLING,
    actionType: TaskActionType.SEND_PAYMENT_REMINDER,
    payload: {
      scope: 'overdue_invoices',
      count: metrics.overdueInvoicesCount,
      amount: metrics.overdueInvoicesAmount,
    },
  });
}
function buildUnconfirmedQuickAction(metrics: DashboardCache['metrics']): QuickAction | null {
  if (metrics.unconfirmedAppointments <= 0) return null;
  return buildQuickAction({
    id: 'quick-confirm-appointments',
    label: 'Confirm appointments',
    icon: 'calendar-days',
    title: 'Confirm upcoming appointments',
    description: `Confirm ${metrics.unconfirmedAppointments} appointment(s) for today/tomorrow.`,
    category: TaskLedgerCategory.SCHEDULING,
    actionType: TaskActionType.SEND_APPOINTMENT_CONFIRMATION,
    payload: {
      scope: 'unconfirmed_appointments',
      count: metrics.unconfirmedAppointments,
    },
  });
}
function buildPendingQuotesQuickAction(metrics: DashboardCache['metrics']): QuickAction | null {
  if (metrics.pendingQuotesCount <= 0) return null;
  return buildQuickAction({
    id: 'quick-followup-quotes',
    label: 'Follow up quotes',
    icon: 'file-text',
    title: 'Follow up pending quotes',
    description: `Nudge ${metrics.pendingQuotesCount} open quote(s).`,
    category: TaskLedgerCategory.MARKETING,
    actionType: TaskActionType.SEND_QUOTE_FOLLOWUP,
    payload: {
      scope: 'pending_quotes',
      count: metrics.pendingQuotesCount,
      amount: metrics.pendingQuotesAmount,
    },
  });
}
function buildReviewRequestQuickAction(): QuickAction {
  return buildQuickAction({
    id: 'quick-review-request',
    label: 'Request reviews',
    icon: 'sparkles',
    title: 'Send review requests',
    description: 'Ask recent customers for a review.',
    category: TaskLedgerCategory.MARKETING,
    actionType: TaskActionType.SEND_REVIEW_REQUEST,
    payload: {
      scope: 'recent_customers',
    },
  });
}
function buildOverdueWin(metrics: DashboardCache['metrics']): OneTapWin | null {
  if (metrics.overdueInvoicesAmount <= 0) return null;
  return {
    id: 'win-overdue-invoices',
    headline: `Recover $${formatCurrency(metrics.overdueInvoicesAmount)}`,
    subtext: `${metrics.overdueInvoicesCount} overdue invoices ready for reminders.`,
    impact: { revenue: metrics.overdueInvoicesAmount, label: 'recoverable' },
    action: buildAction({
      label: 'Queue reminders',
      title: 'Send overdue invoice reminders',
      description: `Follow up ${metrics.overdueInvoicesCount} overdue invoice(s).`,
      category: TaskLedgerCategory.BILLING,
      icon: 'dollar-sign',
      actionType: TaskActionType.SEND_PAYMENT_REMINDER,
      payload: {
        scope: 'overdue_invoices',
        count: metrics.overdueInvoicesCount,
        amount: metrics.overdueInvoicesAmount,
      },
    }),
    entityType: 'invoice',
  };
}
function buildAppointmentsWin(metrics: DashboardCache['metrics']): OneTapWin | null {
  if (metrics.unconfirmedAppointments <= 0) return null;
  return {
    id: 'win-confirm-appointments',
    headline: `Confirm ${metrics.unconfirmedAppointments} appointments`,
    subtext: 'Lock in today and tomorrow’s schedule.',
    impact: { label: 'retention' },
    action: buildAction({
      label: 'Queue confirmations',
      title: 'Confirm upcoming appointments',
      description: `Confirm ${metrics.unconfirmedAppointments} appointment(s).`,
      category: TaskLedgerCategory.SCHEDULING,
      icon: 'calendar-days',
      actionType: TaskActionType.SEND_APPOINTMENT_CONFIRMATION,
      payload: {
        scope: 'unconfirmed_appointments',
        count: metrics.unconfirmedAppointments,
      },
    }),
    entityType: 'appointment',
  };
}
function buildQuotesWin(metrics: DashboardCache['metrics']): OneTapWin | null {
  if (metrics.pendingQuotesAmount <= 0) return null;
  return {
    id: 'win-followup-quotes',
    headline: `Close $${formatCurrency(metrics.pendingQuotesAmount)} in quotes`,
    subtext: `${metrics.pendingQuotesCount} quotes waiting on follow-up.`,
    impact: { revenue: metrics.pendingQuotesAmount, label: 'pipeline' },
    action: buildAction({
      label: 'Queue follow-ups',
      title: 'Follow up pending quotes',
      description: `Nudge ${metrics.pendingQuotesCount} open quote(s).`,
      category: TaskLedgerCategory.MARKETING,
      icon: 'file-text',
      actionType: TaskActionType.SEND_QUOTE_FOLLOWUP,
      payload: {
        scope: 'pending_quotes',
        count: metrics.pendingQuotesCount,
        amount: metrics.pendingQuotesAmount,
      },
    }),
    entityType: 'quote',
  };
}
