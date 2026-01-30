import { fetchWithAuth, getApiUrl } from './client';

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  actionType: string;
  actionLabel: string;
  actionParams: Record<string, unknown>;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedImpact?: string;
  icon?: string;
}

export interface SuggestionsResponse {
  context: string;
  suggestions: Suggestion[];
  generatedAt: string;
  expiresAt: string;
}

export async function getSuggestions(
  context: string,
  entityId?: string,
): Promise<SuggestionsResponse> {
  const params = new URLSearchParams();
  if (entityId) params.set('entityId', entityId);
  const queryString = params.toString();
  const url = getApiUrl(`/ai/suggestions/${context}${queryString ? `?${queryString}` : ''}`);
  return fetchWithAuth(url);
}

export async function refreshSuggestions(context: string): Promise<SuggestionsResponse> {
  const url = getApiUrl(`/ai/suggestions/${context}/refresh`);
  return fetchWithAuth(url, { method: 'POST' });
}

export async function invalidateAllSuggestions(): Promise<void> {
  const url = getApiUrl('/ai/suggestions/invalidate');
  await fetchWithAuth(url, { method: 'POST' });
}

export function getPriorityColor(priority: Suggestion['priority']): string {
  const colors: Record<Suggestion['priority'], string> = {
    HIGH: 'border-l-red-500 bg-red-50',
    MEDIUM: 'border-l-yellow-500 bg-yellow-50',
    LOW: 'border-l-blue-500 bg-blue-50',
  };
  return colors[priority] || 'border-l-gray-500 bg-gray-50';
}

export function getSuggestionIcon(icon?: string): string {
  const icons: Record<string, string> = {
    users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    gift: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
    calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    'calendar-check': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    dollar: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };
  return icons[icon || 'star'] || icons.star;
}
