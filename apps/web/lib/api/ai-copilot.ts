import { fetchWithAuth, getApiUrl } from './client';
import {
  Conversation,
  ConversationSummary,
  CopilotResponse,
  SendMessageRequest,
} from '@/lib/types/ai-copilot';
import { WeeklyReport } from '@/lib/types/weekly-report';

// Chat endpoints
export async function sendChatMessage(
  request: SendMessageRequest
): Promise<CopilotResponse> {
  return fetchWithAuth(getApiUrl('/ai-copilot/chat'), {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getConversations(): Promise<ConversationSummary[]> {
  return fetchWithAuth(getApiUrl('/ai-copilot/conversations'));
}

export async function getConversation(id: string): Promise<Conversation> {
  return fetchWithAuth(getApiUrl(`/ai-copilot/conversations/${id}`));
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
