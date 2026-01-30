'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChatMessage,
  ConversationSummary,
} from '@/lib/types/ai-copilot';
import {
  sendChatMessageStream,
  getConversations,
  getConversation,
  deleteConversation,
} from '@/lib/api/ai-copilot';
import { sanitizeMessage } from '@/lib/utils';

const MAX_MESSAGES = 100; // Limit message history to prevent memory issues

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
      setError(null);
      setIsLoading(true);
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
      setError(null);
      setIsLoading(true);
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

      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        toolsUsed: [],
        createdAt: new Date().toISOString(),
      };

      // Track this message ID for potential cleanup
      pendingUserMessageIdRef.current = userMessage.id;

      // Add both user message and placeholder assistant message
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsSending(true);
      setError(null);

      try {
        const stream = sendChatMessageStream(
          {
            message: sanitizedContent,
            conversationId: currentConversationId || undefined,
          },
          { signal: abortController.signal }
        );

        let fullContent = '';
        const toolsUsed: string[] = [];

        for await (const event of stream) {
          // Check if aborted
          if (abortController.signal.aborted) {
            return;
          }

          if (event.type === 'text' && event.content) {
            fullContent += event.content;
            // Update the assistant message with new content
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: fullContent }
                  : m
              )
            );
          } else if (event.type === 'tool_start' && event.toolName) {
            toolsUsed.push(event.toolName);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, toolsUsed: Array.from(new Set(toolsUsed)) }
                  : m
              )
            );
          } else if (event.type === 'done') {
            if (event.toolsUsed) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, toolsUsed: event.toolsUsed }
                    : m
                )
              );
            }
            if (!currentConversationId && event.conversationId) {
              setCurrentConversationId(event.conversationId);
              loadConversations();
            }
          } else if (event.type === 'error') {
            setError(event.content || 'An error occurred');
          }
        }

        // Trim old messages if exceeding limit (keep most recent)
        setMessages((prev) => {
          if (prev.length > MAX_MESSAGES) {
            return prev.slice(-MAX_MESSAGES);
          }
          return prev;
        });
      } catch (err) {
        // Clean up messages on any error (including abort)
        setMessages((prev) =>
          prev.filter(
            (m) => m.id !== userMessage.id && m.id !== assistantMessageId
          )
        );
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
