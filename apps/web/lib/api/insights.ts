import { fetchWithAuth, getApiUrl } from './client';

export type AgentType = 'REVENUE_SALES' | 'CUSTOMER_SUCCESS' | 'OPERATIONS' | 'MARKETING';
export type InsightPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type InsightStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface AgentInsight {
  id: string;
  tenantId: string;
  agentType: AgentType;
  entityType: string;
  entityId: string;
  insightType: string;
  title: string;
  description: string;
  confidenceScore: number;
  impactScore: number;
  priority: InsightPriority;
  recommendedAction: string;
  actionParams?: Record<string, unknown>;
  actionLabel: string;
  status: InsightStatus;
  expiresAt?: string;
  aiReasoning?: string;
  createdAt: string;
}

export interface InsightSummary {
  total: number;
  byPriority: Record<InsightPriority, number>;
  byAgent: Record<AgentType, number>;
  byStatus: Record<InsightStatus, number>;
  pendingUrgent: number;
  pendingHigh: number;
}

export interface InsightsListResponse {
  insights: AgentInsight[];
  total: number;
}

export interface InsightFilters {
  agentType?: AgentType;
  priority?: InsightPriority;
  status?: InsightStatus;
  entityType?: string;
  limit?: number;
  offset?: number;
}

export async function getInsights(filters: InsightFilters = {}): Promise<InsightsListResponse> {
  const params = new URLSearchParams();
  if (filters.agentType) params.set('agentType', filters.agentType);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset) params.set('offset', filters.offset.toString());

  const queryString = params.toString();
  const url = getApiUrl(`/insights${queryString ? `?${queryString}` : ''}`);
  const response = await fetchWithAuth(url);
  return response.json();
}

export async function getInsightsSummary(): Promise<InsightSummary> {
  const url = getApiUrl('/insights/summary');
  const response = await fetchWithAuth(url);
  return response.json();
}

export async function getInsight(id: string): Promise<AgentInsight> {
  const url = getApiUrl(`/insights/${id}`);
  const response = await fetchWithAuth(url);
  return response.json();
}

export async function updateInsightStatus(
  id: string,
  status: InsightStatus,
  rejectionReason?: string,
): Promise<AgentInsight> {
  const url = getApiUrl(`/insights/${id}/status`);
  const response = await fetchWithAuth(url, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejectionReason }),
  });
  return response.json();
}

export async function deleteInsight(id: string): Promise<void> {
  const url = getApiUrl(`/insights/${id}`);
  await fetchWithAuth(url, { method: 'DELETE' });
}

export async function triggerAgent(agentType: AgentType): Promise<{ runId: string; status: string }> {
  const url = getApiUrl(`/agents/${agentType.toLowerCase()}/run`);
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return response.json();
}

export async function triggerAllAgents(): Promise<Record<AgentType, string>> {
  const url = getApiUrl('/agents/run-all');
  const response = await fetchWithAuth(url, { method: 'POST' });
  const data = await response.json();
  return data.results;
}

export function getAgentLabel(agentType: AgentType): string {
  const labels: Record<AgentType, string> = {
    REVENUE_SALES: 'Revenue & Sales',
    CUSTOMER_SUCCESS: 'Customer Success',
    OPERATIONS: 'Operations',
    MARKETING: 'Marketing',
  };
  return labels[agentType] || agentType;
}

export function getPriorityColor(priority: InsightPriority): string {
  const colors: Record<InsightPriority, string> = {
    URGENT: 'text-red-600 bg-red-100',
    HIGH: 'text-orange-600 bg-orange-100',
    MEDIUM: 'text-yellow-600 bg-yellow-100',
    LOW: 'text-gray-600 bg-gray-100',
  };
  return colors[priority] || 'text-gray-600 bg-gray-100';
}

export function getPriorityIcon(priority: InsightPriority): string {
  const icons: Record<InsightPriority, string> = {
    URGENT: '🔴',
    HIGH: '🟠',
    MEDIUM: '🟡',
    LOW: '🟢',
  };
  return icons[priority] || '⚪';
}
