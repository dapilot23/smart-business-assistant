export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolsUsed?: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  preview: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CopilotResponse {
  message: string;
  conversationId: string;
  toolsUsed: string[];
  data?: Record<string, unknown>;
}

export interface SendMessageRequest {
  message: string;
  conversationId?: string;
}

export interface CopilotStreamEvent {
  type: 'text' | 'tool_start' | 'tool_end' | 'done' | 'error';
  content?: string;
  toolName?: string;
  conversationId?: string;
  toolsUsed?: string[];
}
