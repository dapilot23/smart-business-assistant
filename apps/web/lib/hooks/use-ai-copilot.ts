'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChatMessage,
  ConversationSummary,
  CopilotResponse,
} from '@/lib/types/ai-copilot';
import {
  sendChatMessage,
  getConversations,
  getConversation,
  deleteConversation,
} from '@/lib/api/ai-copilot';
import { sanitizeMessage } from '@/lib/utils';

export function useAiCopilot() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AbortController refs for cancelling in-flight requests
  const loadConversationsAbortRef = useRef<AbortController | null>(null);
  const loadConversationAbortRef = useRef<AbortController | null>(null);
  const sendMessageAbortRef = useRef<AbortController | null>(null);
  // Track pending user message ID for cleanup on abort
  const pendingUserMessageIdRef = useRef<string | null>(null);

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      loadConversationsAbortRef.current?.abort();
      loadConversationAbortRef.current?.abort();
      sendMessageAbortRef.current?.abort();
    };
  }, []);

  const loadConversations = useCallback(async () => {
    // Cancel any in-flight request
    loadConversationsAbortRef.current?.abort();
    const abortController = new AbortController();
    loadConversationsAbortRef.current = abortController;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getConversations({ signal: abortController.signal });
      if (!abortController.signal.aborted) {
        setConversations(data);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(
        err instanceof Error ? err.message : 'Failed to load conversations'
      );
    } finally {
      // Always reset loading state - even on abort we're no longer loading
      setIsLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    // Cancel any in-flight conversation load
    loadConversationAbortRef.current?.abort();
    const abortController = new AbortController();
    loadConversationAbortRef.current = abortController;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getConversation(id, { signal: abortController.signal });
      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setMessages(data.messages || []);
        setCurrentConversationId(id);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(
        err instanceof Error ? err.message : 'Failed to load conversation'
      );
    } finally {
      // Always reset loading state - even on abort we're no longer loading
      setIsLoading(false);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    // Cancel any pending send
    if (sendMessageAbortRef.current) {
      sendMessageAbortRef.current.abort();
    }
    setCurrentConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      // Sanitize input before processing
      const sanitizedContent = sanitizeMessage(content);
      if (!sanitizedContent || isSending) return;

      // Cancel any in-flight message send and clean up pending message
      if (sendMessageAbortRef.current) {
        sendMessageAbortRef.current.abort();
        // Remove the pending user message from previous aborted request
        if (pendingUserMessageIdRef.current) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== pendingUserMessageIdRef.current)
          );
        }
      }

      const abortController = new AbortController();
      sendMessageAbortRef.current = abortController;

      const userMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: sanitizedContent,
        createdAt: new Date().toISOString(),
      };

      // Track this message ID for potential cleanup
      pendingUserMessageIdRef.current = userMessage.id;

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      try {
        const response: CopilotResponse = await sendChatMessage(
          {
            message: sanitizedContent,
            conversationId: currentConversationId || undefined,
          },
          { signal: abortController.signal }
        );

        // If aborted after response arrived, don't process
        if (abortController.signal.aborted) {
          return;
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.message,
          toolsUsed: response.toolsUsed,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (!currentConversationId && response.conversationId) {
          setCurrentConversationId(response.conversationId);
          loadConversations();
        }
      } catch (err) {
        // Clean up user message on any error (including abort)
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        // Only set error for non-abort errors
        if (!(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Failed to send message');
        }
      } finally {
        // Always reset sending state - even on abort we're no longer sending
        setIsSending(false);
        pendingUserMessageIdRef.current = null;
      }
    },
    [currentConversationId, isSending, loadConversations]
  );

  const removeConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          startNewConversation();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete conversation'
        );
      }
    },
    [currentConversationId, startNewConversation]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    isSending,
    error,
    loadConversations,
    loadConversation,
    startNewConversation,
    sendMessage,
    removeConversation,
    clearError: () => setError(null),
  };
}
