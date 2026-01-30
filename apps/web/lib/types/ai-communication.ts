export interface SuggestedResponse {
  id: string;
  tenantId: string;
  conversationId: string;
  messageId?: string | null;
  suggestion: string;
  confidence?: number | null;
  tone?: string | null;
  accepted?: boolean | null;
  editedText?: string | null;
  createdAt: string;
}
