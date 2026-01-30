import { fetchWithAuth, getApiUrl } from './client';
import { SuggestedResponse } from '@/lib/types/ai-communication';

export async function listSuggestedResponses(conversationId: string): Promise<SuggestedResponse[]> {
  return fetchWithAuth(getApiUrl(`/ai-communication/suggestions/${conversationId}`));
}

export async function generateSuggestedResponses(
  conversationId: string,
  options?: { messageId?: string; count?: number },
): Promise<SuggestedResponse[]> {
  return fetchWithAuth(getApiUrl(`/ai-communication/suggestions/${conversationId}/generate`), {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
}

export async function acceptSuggestedResponse(
  id: string,
  editedText?: string,
): Promise<{ success: true }> {
  return fetchWithAuth(getApiUrl(`/ai-communication/suggestions/${id}/accept`), {
    method: 'POST',
    body: JSON.stringify({ editedText }),
  });
}

export async function dismissSuggestedResponse(id: string): Promise<{ success: true }> {
  return fetchWithAuth(getApiUrl(`/ai-communication/suggestions/${id}/dismiss`), {
    method: 'POST',
  });
}
