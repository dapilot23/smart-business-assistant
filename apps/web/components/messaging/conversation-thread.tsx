"use client";

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConversationThread, Message } from '@/lib/api/messaging';

interface ConversationThreadProps {
  conversation: ConversationThread | null;
  messages: Message[];
  loading: boolean;
  messageInput: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
}

export function ConversationThreadView({
  conversation,
  messages,
  loading,
  messageInput,
  onMessageChange,
  onSend,
}: ConversationThreadProps) {
  return (
    <Card className="flex flex-col min-h-[520px]">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">
            {conversation?.customerName || 'Select a conversation'}
          </h2>
          <p className="text-xs text-muted-foreground">{conversation?.customerPhone || ''}</p>
        </div>
        {conversation?.priority && (
          <Badge variant="outline">{conversation.priority}</Badge>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">No messages yet.</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                  msg.direction === 'OUTBOUND'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-border p-4 flex items-center gap-2">
        <Input
          value={messageInput}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Type a reply..."
          className="flex-1"
          disabled={!conversation}
        />
        <Button onClick={onSend} disabled={!conversation || !messageInput.trim()}>
          Send
        </Button>
      </div>
    </Card>
  );
}
