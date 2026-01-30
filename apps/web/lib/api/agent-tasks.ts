import { fetchWithAuth, getApiUrl } from './client';
import type { AgentTask, CreateAgentTaskDto, UpdateAgentTaskDto, TaskStatus } from '@/lib/types/agent-task';

export async function getAgentTasks(params?: {
  status?: TaskStatus;
  ownerType?: string;
  ownerAgentType?: string;
  ownerUserId?: string;
  limit?: number;
}): Promise<AgentTask[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.ownerType) query.set('ownerType', params.ownerType);
  if (params?.ownerAgentType) query.set('ownerAgentType', params.ownerAgentType);
  if (params?.ownerUserId) query.set('ownerUserId', params.ownerUserId);
  if (params?.limit) query.set('limit', String(params.limit));
  const queryString = query.toString();
  const url = getApiUrl(`/agent-tasks${queryString ? `?${queryString}` : ''}`);
  return fetchWithAuth(url);
}

export async function getAgentTask(id: string): Promise<AgentTask> {
  return fetchWithAuth(getApiUrl(`/agent-tasks/${id}`));
}

export async function createAgentTask(data: CreateAgentTaskDto): Promise<AgentTask> {
  return fetchWithAuth(getApiUrl('/agent-tasks'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAgentTask(id: string, data: UpdateAgentTaskDto): Promise<AgentTask> {
  return fetchWithAuth(getApiUrl(`/agent-tasks/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
