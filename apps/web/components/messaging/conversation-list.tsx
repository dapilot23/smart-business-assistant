"use client";

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConversationThread } from '@/lib/api/messaging';

interface ConversationListProps {
  conversations: ConversationThread[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  loading,
  onSelect,
}: ConversationListProps) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border text-sm font-medium">Conversations</div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
        ) : (
          conversations.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onSelect(thread.id)}
              className={`w-full text-left px-4 py-3 border-b border-border transition ${
                selectedId === thread.id ? 'bg-muted/50' : 'hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {thread.customerName || thread.customerPhone}
                </span>
                {thread.unreadCount > 0 && (
                  <Badge variant="secondary">{thread.unreadCount}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {thread.lastMessagePreview || 'No messages yet'}
              </p>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}
