import { fetchWithAuth, getApiUrl } from './client';

export type TaskLedgerType = 'AI_ACTION' | 'SYSTEM_TASK' | 'HUMAN_TASK' | 'APPROVAL';
export type TaskLedgerCategory =
  | 'BILLING'
  | 'SCHEDULING'
  | 'MESSAGING'
  | 'MARKETING'
  | 'OPERATIONS';
export type TaskLedgerStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'UNDONE';

export type SignalPriority = 'high' | 'medium' | 'low';
export type SignalType = 'WARNING' | 'OPPORTUNITY' | 'INFO' | 'SUCCESS';

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
  todayRevenue: number;
  todayRevenueTarget: number;
  weekAppointments: number;
  weekRevenue: number;
  overdueInvoicesCount: number;
  overdueInvoicesAmount: number;
  unconfirmedAppointments: number;
  pendingQuotesCount: number;
  pendingQuotesAmount: number;
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

export interface DashboardSignal {
  id: string;
  type: SignalType;
  icon: string;
  title: string;
  detail: string;
  count?: number;
  amount?: number;
  priority: SignalPriority;
  action?: SignalAction;
  createdAt: string;
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
  category: TaskLedgerCategory | string;
  priority: number;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  status: TaskLedgerStatus | string;
  category: TaskLedgerCategory | string;
  priority: number;
  entityType?: string;
  entityId?: string;
  scheduledFor?: string;
  createdAt: string;
}

export interface CommandCenterDashboard {
  statusBar: StatusBarData;
  taskStats: TaskStatsData;
  metrics: DashboardMetrics;
  approvals: ApprovalItem[];
  tasks: TaskItem[];
  signals: DashboardSignal[];
  oneTapWin: OneTapWin | null;
  quickActions: QuickAction[];
  cachedAt: string;
}

export async function getCommandCenterDashboard(params?: {
  approvalsLimit?: number;
  tasksLimit?: number;
}): Promise<CommandCenterDashboard> {
  const query = new URLSearchParams();
  if (params?.approvalsLimit) query.set('approvalsLimit', String(params.approvalsLimit));
  if (params?.tasksLimit) query.set('tasksLimit', String(params.tasksLimit));
  const queryString = query.toString();
  return fetchWithAuth(
    getApiUrl(`/command-center/dashboard${queryString ? `?${queryString}` : ''}`)
  );
}

export interface CreateTaskLedgerDto {
  type: TaskLedgerType;
  category: TaskLedgerCategory;
  title: string;
  description?: string;
  icon?: string;
  entityType?: string;
  entityId?: string;
  actionType?: string;
  actionEndpoint?: string;
  payload?: Record<string, unknown>;
  scheduledFor?: string;
  undoWindowMins?: number;
  undoEndpoint?: string;
  undoPayload?: Record<string, unknown>;
  aiConfidence?: number;
  aiReasoning?: string;
  aiModel?: string;
  idempotencyKey?: string;
  traceId?: string;
}

export async function createTaskLedger(
  data: CreateTaskLedgerDto
): Promise<TaskItem> {
  return fetchWithAuth(getApiUrl('/task-ledger'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function refreshCommandCenterDashboard(params?: {
  approvalsLimit?: number;
  tasksLimit?: number;
}): Promise<CommandCenterDashboard> {
  const query = new URLSearchParams();
  if (params?.approvalsLimit) query.set('approvalsLimit', String(params.approvalsLimit));
  if (params?.tasksLimit) query.set('tasksLimit', String(params.tasksLimit));
  const queryString = query.toString();
  return fetchWithAuth(
    getApiUrl(`/command-center/dashboard/refresh${queryString ? `?${queryString}` : ''}`),
    { method: 'POST' }
  );
}

export async function approveTaskLedger(id: string) {
  return fetchWithAuth(getApiUrl(`/task-ledger/${id}/approve`), { method: 'POST' });
}

export async function declineTaskLedger(id: string, reason?: string) {
  return fetchWithAuth(getApiUrl(`/task-ledger/${id}/decline`), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function completeTaskLedger(id: string) {
  return fetchWithAuth(getApiUrl(`/task-ledger/${id}/complete`), { method: 'POST' });
}
