'use client';

import { useRef, useEffect, useState } from 'react';
import { X, PanelLeftClose, PanelLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAiCopilot } from '@/lib/hooks/use-ai-copilot';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { ConversationSidebar } from './conversation-sidebar';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  promptKey?: number;
  onPromptHandled?: () => void;
}

export function ChatPanel({
  isOpen,
  onClose,
  initialPrompt,
  promptKey,
  onPromptHandled,
}: ChatPanelProps) {
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastPromptKeyRef = useRef<number | null>(null);

  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    isSending,
    error,
    loadConversation,
    startNewConversation,
    sendMessage,
    removeConversation,
    clearError,
  } = useAiCopilot();

  // Only scroll when panel is open to prevent memory leaks
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen || !initialPrompt) return;
    if (typeof promptKey === 'number') {
      if (lastPromptKeyRef.current === promptKey) return;
      lastPromptKeyRef.current = promptKey;
    }
    sendMessage(initialPrompt);
    onPromptHandled?.();
  }, [initialPrompt, isOpen, onPromptHandled, promptKey, sendMessage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative flex h-full bg-background shadow-xl transition-all',
          showSidebar ? 'w-full max-w-3xl' : 'w-full max-w-lg'
        )}
      >
        {/* Sidebar */}
        {showSidebar && (
          <ConversationSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={loadConversation}
            onDeleteConversation={removeConversation}
            onNewConversation={startNewConversation}
          />
        )}

        {/* Chat Area */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="h-8 w-8"
              >
                {showSidebar ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">AI Assistant</h2>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <Sparkles className="h-12 w-12 text-primary/50" />
                <h3 className="mt-4 text-lg font-medium">
                  How can I help you today?
                </h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Ask me anything about your business - revenue, appointments,
                  customers, team performance, and more.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    'How did we do this week?',
                    'Show at-risk customers',
                    'Revenue by service',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {messages.map((message, index) => {
                  // The last assistant message is streaming if isSending is true
                  const isLastAssistant =
                    message.role === 'assistant' &&
                    index === messages.length - 1;
                  const isStreaming = isSending && isLastAssistant;

                  return (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isStreaming={isStreaming}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
              <button
                onClick={clearError}
                className="ml-2 underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Input */}
          <ChatInput
            onSend={sendMessage}
            isSending={isSending}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
