import { fetchWithAuth, getApiUrl } from './client';

export type ActionType =
  | 'CREATE_CAMPAIGN'
  | 'SEND_SMS'
  | 'SEND_EMAIL'
  | 'SCHEDULE_APPOINTMENT'
  | 'CREATE_QUOTE'
  | 'APPLY_DISCOUNT'
  | 'SCHEDULE_FOLLOW_UP'
  | 'CREATE_SEGMENT';

export type ActionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface AIAction {
  id: string;
  tenantId: string;
  insightId?: string;
  copilotSessionId?: string;
  actionType: ActionType;
  title: string;
  description: string;
  params: Record<string, unknown>;
  requiresApproval: boolean;
  status: ActionStatus;
  executedAt?: string;
  executedBy?: string;
  result?: unknown;
  errorMessage?: string;
  estimatedImpact?: string;
  riskLevel: string;
  createdAt: string;
  expiresAt?: string;
}

export interface CreateActionDto {
  actionType: ActionType;
  title: string;
  description: string;
  params: Record<string, unknown>;
  insightId?: string;
  copilotSessionId?: string;
  estimatedImpact?: string;
  riskLevel?: string;
  requiresApproval?: boolean;
  expiresAt?: string;
}

export async function getActions(status?: ActionStatus): Promise<AIAction[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const queryString = params.toString();
  const url = getApiUrl(`/ai/actions${queryString ? `?${queryString}` : ''}`);
  return fetchWithAuth(url);
}

export async function getAction(id: string): Promise<AIAction> {
  const url = getApiUrl(`/ai/actions/${id}`);
  return fetchWithAuth(url);
}

export async function getPendingActionsCount(): Promise<number> {
  const url = getApiUrl('/ai/actions/pending-count');
  const data = await fetchWithAuth(url);
  return data.count;
}

export async function createAction(data: CreateActionDto): Promise<AIAction> {
  const url = getApiUrl('/ai/actions');
  return fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function approveAction(id: string): Promise<AIAction> {
  const url = getApiUrl(`/ai/actions/${id}/approve`);
  return fetchWithAuth(url, { method: 'POST' });
}

export async function cancelAction(id: string): Promise<AIAction> {
  const url = getApiUrl(`/ai/actions/${id}/cancel`);
  return fetchWithAuth(url, { method: 'POST' });
}

export async function createActionFromInsight(insightId: string): Promise<AIAction> {
  const url = getApiUrl(`/ai/actions/from-insight/${insightId}`);
  return fetchWithAuth(url, { method: 'POST' });
}

export function getActionTypeLabel(actionType: ActionType): string {
  const labels: Record<ActionType, string> = {
    CREATE_CAMPAIGN: 'Create Campaign',
    SEND_SMS: 'Send SMS',
    SEND_EMAIL: 'Send Email',
    SCHEDULE_APPOINTMENT: 'Schedule Appointment',
    CREATE_QUOTE: 'Create Quote',
    APPLY_DISCOUNT: 'Apply Discount',
    SCHEDULE_FOLLOW_UP: 'Schedule Follow-up',
    CREATE_SEGMENT: 'Create Segment',
  };
  return labels[actionType] || actionType;
}

export function getActionStatusColor(status: ActionStatus): string {
  const colors: Record<ActionStatus, string> = {
    PENDING: 'text-yellow-600 bg-yellow-100',
    APPROVED: 'text-blue-600 bg-blue-100',
    EXECUTING: 'text-purple-600 bg-purple-100',
    COMPLETED: 'text-green-600 bg-green-100',
    FAILED: 'text-red-600 bg-red-100',
    CANCELLED: 'text-gray-600 bg-gray-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}
