import { fetchWithAuth, getApiUrl } from './client';

export interface ConversationThread {
  id: string;
  customerId: string;
  customerName?: string | null;
  customerPhone: string;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IMESSAGE';
  status: string;
  priority: string;
  unreadCount: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  tags: string[];
  assignedTo?: string | null;
  messages?: Message[];
}

export interface Message {
  id: string;
  content: string;
  direction: 'INBOUND' | 'OUTBOUND';
  createdAt: string;
  status: string;
}

export async function listConversations(): Promise<ConversationThread[]> {
  return fetchWithAuth(getApiUrl('/messaging/conversations'));
}

export async function getConversation(id: string): Promise<ConversationThread> {
  return fetchWithAuth(getApiUrl(`/messaging/conversations/${id}`));
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  return fetchWithAuth(getApiUrl(`/messaging/conversations/${conversationId}/messages`), {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await fetchWithAuth(getApiUrl(`/messaging/conversations/${conversationId}/read`), {
    method: 'POST',
  });
}
