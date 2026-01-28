import { fetchWithAuth, getApiUrl } from './client';
import {
  Conversation,
  ConversationSummary,
  CopilotResponse,
  SendMessageRequest,
} from '@/lib/types/ai-copilot';
import { WeeklyReport } from '@/lib/types/weekly-report';

interface RequestOptions {
  signal?: AbortSignal;
}

// Chat endpoints
export async function sendChatMessage(
  request: SendMessageRequest,
  options?: RequestOptions
): Promise<CopilotResponse> {
  return fetchWithAuth(getApiUrl('/ai-copilot/chat'), {
    method: 'POST',
    body: JSON.stringify(request),
    signal: options?.signal,
  });
}

export async function getConversations(
  options?: RequestOptions
): Promise<ConversationSummary[]> {
  return fetchWithAuth(getApiUrl('/ai-copilot/conversations'), {
    signal: options?.signal,
  });
}

export async function getConversation(
  id: string,
  options?: RequestOptions
): Promise<Conversation> {
  return fetchWithAuth(getApiUrl(`/ai-copilot/conversations/${id}`), {
    signal: options?.signal,
  });
}

export async function deleteConversation(id: string): Promise<void> {
  return fetchWithAuth(getApiUrl(`/ai-copilot/conversations/${id}`), {
    method: 'DELETE',
  });
}

// Weekly Reports endpoints
export async function getWeeklyReports(
  limit?: number
): Promise<WeeklyReport[]> {
  const url = limit
    ? getApiUrl(`/ai-copilot/reports?limit=${limit}`)
    : getApiUrl('/ai-copilot/reports');
  return fetchWithAuth(url);
}

export async function getLatestReport(): Promise<WeeklyReport | null> {
  return fetchWithAuth(getApiUrl('/ai-copilot/reports/latest'));
}

export async function generateReport(): Promise<WeeklyReport> {
  return fetchWithAuth(getApiUrl('/ai-copilot/reports/generate'), {
    method: 'POST',
  });
}
