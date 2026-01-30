import {
  AgentType,
  TaskOwnerType,
  TaskPriority,
  TaskSourceType,
} from '@prisma/client';
import { CeoMetrics, TaskCandidate } from './ceo-agent.types';

interface OwnerAssignment {
  ownerType: TaskOwnerType;
  ownerUserId?: string;
  ownerAgentType?: AgentType;
}

export function buildPendingActionsTask(
  pendingActions: number,
  ownerUserId?: string,
): TaskCandidate | null {
  if (pendingActions < 1) return null;
  const owner = resolveHumanOwner(ownerUserId);

  return {
    title: 'Review pending AI actions',
    description: `${pendingActions} AI action(s) are awaiting approval. Review and approve or cancel.`,
    ownerType: owner.ownerType,
    ownerUserId: owner.ownerUserId,
    ownerAgentType: owner.ownerAgentType,
    priority: pendingActions >= 5 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
    dueAt: daysFromNow(1),
    sourceType: TaskSourceType.ACTION,
    sourceId: 'pending_ai_actions',
    metadata: { pendingActions },
  };
}

export function buildPendingQuotesTask(pendingQuotes: number): TaskCandidate | null {
  if (pendingQuotes < 5) return null;
  return {
    title: 'Follow up on pending quotes',
    description: `${pendingQuotes} quotes are still pending. Prioritize follow-ups and close deals.`,
    ownerType: TaskOwnerType.AI_AGENT,
    ownerAgentType: AgentType.REVENUE_SALES,
    priority: pendingQuotes >= 10 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
    dueAt: daysFromNow(2),
    sourceType: TaskSourceType.INSIGHT,
    sourceId: 'pending_quotes',
    metadata: { pendingQuotes },
  };
}

export function buildOverdueInvoicesTask(overdueInvoices: number): TaskCandidate | null {
  if (overdueInvoices < 1) return null;
  return {
    title: 'Resolve overdue invoices',
    description: `${overdueInvoices} invoices are overdue. Send payment reminders or follow up directly.`,
    ownerType: TaskOwnerType.AI_AGENT,
    ownerAgentType: AgentType.OPERATIONS,
    priority: overdueInvoices >= 5 ? TaskPriority.URGENT : TaskPriority.HIGH,
    dueAt: daysFromNow(1),
    sourceType: TaskSourceType.EVENT,
    sourceId: 'overdue_invoices',
    metadata: { overdueInvoices },
  };
}

export function buildUnconfirmedAppointmentsTask(unconfirmed: number): TaskCandidate | null {
  if (unconfirmed < 3) return null;
  return {
    title: 'Confirm upcoming appointments',
    description: `${unconfirmed} appointments in the next 24 hours are not confirmed. Send confirmations now.`,
    ownerType: TaskOwnerType.AI_AGENT,
    ownerAgentType: AgentType.OPERATIONS,
    priority: TaskPriority.HIGH,
    dueAt: hoursFromNow(6),
    sourceType: TaskSourceType.EVENT,
    sourceId: 'unconfirmed_appointments',
    metadata: { unconfirmed },
  };
}

export function buildUnassignedAppointmentsTask(unassigned: number): TaskCandidate | null {
  if (unassigned < 2) return null;
  return {
    title: 'Assign unassigned appointments',
    description: `${unassigned} upcoming appointments have no technician assigned. Dispatch now.`,
    ownerType: TaskOwnerType.AI_AGENT,
    ownerAgentType: AgentType.OPERATIONS,
    priority: unassigned >= 5 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
    dueAt: daysFromNow(1),
    sourceType: TaskSourceType.EVENT,
    sourceId: 'unassigned_appointments',
    metadata: { unassigned },
  };
}

export function buildReviewRequestsTask(pendingReviews: number): TaskCandidate | null {
  if (pendingReviews < 5) return null;
  return {
    title: 'Push review requests',
    description: `${pendingReviews} review requests are pending. Trigger outreach to improve reputation.`,
    ownerType: TaskOwnerType.AI_AGENT,
    ownerAgentType: AgentType.MARKETING,
    priority: TaskPriority.MEDIUM,
    dueAt: daysFromNow(3),
    sourceType: TaskSourceType.INSIGHT,
    sourceId: 'pending_review_requests',
    metadata: { pendingReviews },
  };
}

export function buildHiringRecommendationTask(
  metrics: CeoMetrics,
  ownerUserId?: string,
): TaskCandidate | null {
  if (metrics.unassignedAppointments < 8 || metrics.activeTechnicians > 1) return null;
  const owner = resolveHumanOwner(ownerUserId);

  return {
    title: 'Staffing capacity check',
    description:
      `There are ${metrics.unassignedAppointments} unassigned appointments ` +
      `and only ${metrics.activeTechnicians} active technician(s). Consider hiring or adding coverage.`,
    ownerType: owner.ownerType,
    ownerUserId: owner.ownerUserId,
    ownerAgentType: owner.ownerAgentType,
    priority: TaskPriority.HIGH,
    dueAt: daysFromNow(5),
    sourceType: TaskSourceType.MANUAL,
    sourceId: 'staffing_capacity_check',
    metadata: {
      unassignedAppointments: metrics.unassignedAppointments,
      activeTechnicians: metrics.activeTechnicians,
    },
  };
}

function resolveHumanOwner(ownerUserId?: string): OwnerAssignment {
  if (ownerUserId) {
    return { ownerType: TaskOwnerType.HUMAN, ownerUserId };
  }
  return { ownerType: TaskOwnerType.AI_AGENT, ownerAgentType: AgentType.OPERATIONS };
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
