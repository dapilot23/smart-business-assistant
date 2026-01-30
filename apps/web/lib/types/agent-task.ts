export type AgentType =
  | 'REVENUE_SALES'
  | 'CUSTOMER_SUCCESS'
  | 'OPERATIONS'
  | 'MARKETING'
  | 'FOUNDER';

export type TaskOwnerType = 'AI_AGENT' | 'HUMAN';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
export type TaskSourceType =
  | 'INSIGHT'
  | 'ACTION'
  | 'SUGGESTION'
  | 'COPILOT'
  | 'EVENT'
  | 'MANUAL';

export interface AgentTask {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  ownerType: TaskOwnerType;
  ownerAgentType?: AgentType;
  ownerUserId?: string;
  createdByType: TaskOwnerType;
  createdByAgentType?: AgentType;
  createdByUserId?: string;
  dueAt?: string;
  startedAt?: string;
  completedAt?: string;
  blockedReason?: string;
  sourceType?: TaskSourceType;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentTaskDto {
  title: string;
  description?: string;
  ownerType: TaskOwnerType;
  ownerAgentType?: AgentType;
  ownerUserId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueAt?: string;
  blockedReason?: string;
  sourceType?: TaskSourceType;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  createdByType?: TaskOwnerType;
  createdByAgentType?: AgentType;
  createdByUserId?: string;
}

export interface UpdateAgentTaskDto {
  title?: string;
  description?: string;
  ownerType?: TaskOwnerType;
  ownerAgentType?: AgentType;
  ownerUserId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueAt?: string;
  blockedReason?: string;
  metadata?: Record<string, unknown>;
}
