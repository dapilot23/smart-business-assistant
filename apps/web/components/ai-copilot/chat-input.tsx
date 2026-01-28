'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;

export function ChatInput({ onSend, isSending, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef<number>(0);
  // Use ref to always have current message in timeout callback
  const messageRef = useRef(message);
  messageRef.current = message;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || isSending || disabled || isDebouncing) return;

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const now = Date.now();
    const timeSinceLastSend = now - lastSentRef.current;

    if (timeSinceLastSend < DEBOUNCE_MS) {
      // Too soon, debounce - use ref to get fresh message when timer fires
      setIsDebouncing(true);
      debounceTimerRef.current = setTimeout(() => {
        const currentMessage = messageRef.current.trim();
        if (currentMessage) {
          lastSentRef.current = Date.now();
          onSend(currentMessage);
          setMessage('');
        }
        setIsDebouncing(false);
      }, DEBOUNCE_MS - timeSinceLastSend);
    } else {
      // Send immediately
      lastSentRef.current = now;
      onSend(trimmed);
      setMessage('');
    }
  }, [message, isSending, disabled, isDebouncing, onSend]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border p-4">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your business..."
          disabled={isSending || disabled || isDebouncing}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || isSending || disabled || isDebouncing}
          className="h-10 w-10 shrink-0"
        >
          {isSending || isDebouncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
