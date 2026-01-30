'use client';

import { Bot, User, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types/ai-copilot';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const [showTools, setShowTools] = useState(false);
  const isUser = message.role === 'user';
  const hasContent = message.content && message.content.length > 0;
  const isAssistantStreaming = !isUser && isStreaming;

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : isAssistantStreaming && !hasContent ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border'
          )}
        >
          {hasContent ? (
            <p className="whitespace-pre-wrap text-sm">
              {message.content}
              {isAssistantStreaming && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current" />
              )}
            </p>
          ) : isAssistantStreaming ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          )}
        </div>

        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <button
            onClick={() => setShowTools(!showTools)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showTools ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {isAssistantStreaming && 'Using '}
            {message.toolsUsed.length} tool
            {message.toolsUsed.length > 1 ? 's' : ''}
            {!isAssistantStreaming && ' used'}
          </button>
        )}

        {showTools && message.toolsUsed && (
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              Tools {isAssistantStreaming ? 'in use' : 'used'}:
            </p>
            <ul className="mt-1 space-y-1">
              {message.toolsUsed.map((tool, i) => (
                <li key={i} className="text-xs text-foreground">
                  {tool}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isAssistantStreaming && (
          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
