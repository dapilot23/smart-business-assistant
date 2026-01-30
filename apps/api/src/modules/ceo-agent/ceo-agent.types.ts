import { AgentType, TaskOwnerType, TaskPriority, TaskSourceType } from '@prisma/client';

export interface CeoMetrics {
  pendingQuotes: number;
  overdueInvoices: number;
  unconfirmedAppointments: number;
  unassignedAppointments: number;
  pendingReviewRequests: number;
  pendingActions: number;
  activeTechnicians: number;
}

export interface TaskCandidate {
  title: string;
  description: string;
  ownerType: TaskOwnerType;
  ownerAgentType?: AgentType;
  ownerUserId?: string;
  priority: TaskPriority;
  dueAt?: Date;
  sourceType: TaskSourceType;
  sourceId: string;
  metadata?: Record<string, unknown>;
}
