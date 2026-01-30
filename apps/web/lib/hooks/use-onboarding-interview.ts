"use client";

import { useState, useCallback } from 'react';
import {
  InterviewMessage,
  ProgressInfo,
  InterviewSummary,
  getOnboardingStatus,
  startInterview,
  sendMessage as sendMessageApi,
  sendMessageStream,
  skipQuestion as skipQuestionApi,
  completeInterview as completeInterviewApi,
  getInterviewSummary,
  getConversation,
  startVoiceSession as startVoiceSessionApi,
  VoiceSessionConfig,
} from '../api/onboarding-interview';

export interface UseOnboardingInterview {
  // State
  messages: InterviewMessage[];
  progress: ProgressInfo | null;
  isLoading: boolean;
  isSending: boolean;
  isStreaming: boolean;
  error: string | null;
  isComplete: boolean;
  summary: InterviewSummary | null;
  conversationId: string | null;
  canResume: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | null;
  voiceSession: VoiceSessionConfig | null;
  isVoiceActive: boolean;

  // Actions
  checkStatus: () => Promise<void>;
  start: (resume?: boolean) => Promise<void>;
  sendMessage: (message: string, useStreaming?: boolean) => Promise<void>;
  skipQuestion: () => Promise<void>;
  completeEarly: () => Promise<void>;
  loadSummary: () => Promise<void>;
  startVoiceSession: (mode: 'BROWSER_VOICE' | 'PHONE_CALL', phoneNumber?: string) => Promise<void>;
  endVoiceSession: () => void;
}

export function useOnboardingInterview(): UseOnboardingInterview {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [canResume, setCanResume] = useState(false);
  const [status, setStatus] = useState<UseOnboardingInterview['status']>(null);
  const [voiceSession, setVoiceSession] = useState<VoiceSessionConfig | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statusData = await getOnboardingStatus();
      setStatus(statusData.status);
      setCanResume(statusData.canResume);
      setIsComplete(statusData.status === 'COMPLETED');

      if (statusData.status === 'COMPLETED') {
        const summaryData = await getInterviewSummary();
        setSummary(summaryData);
      }

      if (statusData.canResume) {
        const conversationMessages = await getConversation();
        setMessages(conversationMessages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const start = useCallback(async (resume = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await startInterview(resume);

      setConversationId(response.conversationId);
      setProgress(response.progress);
      setStatus('IN_PROGRESS');

      // Add the initial message
      setMessages([
        {
          role: 'assistant',
          content: response.initialMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start interview');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string, useStreaming = true) => {
      if (!conversationId) {
        setError('No active conversation');
        return;
      }

      try {
        setIsSending(true);
        setError(null);

        // Optimistically add user message
        const userMessage: InterviewMessage = {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);

        if (useStreaming) {
          // Use streaming API
          setIsStreaming(true);
          let streamedContent = '';

          // Add a placeholder AI message that we'll update
          const aiMessageIndex = messages.length + 1; // +1 for the user message we just added
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: '',
              timestamp: new Date().toISOString(),
            },
          ]);

          for await (const event of sendMessageStream(conversationId, message)) {
            switch (event.type) {
              case 'text_delta':
                streamedContent += event.content || '';
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[aiMessageIndex] = {
                    ...updated[aiMessageIndex],
                    content: streamedContent,
                  };
                  return updated;
                });
                break;

              case 'done':
                setIsStreaming(false);
                if (event.progress) {
                  setProgress(event.progress);
                }
                if (event.isComplete) {
                  setIsComplete(true);
                  setStatus('COMPLETED');
                  const summaryData = await getInterviewSummary();
                  setSummary(summaryData);
                }
                break;

              case 'error':
                throw new Error(event.message || 'Streaming error');
            }
          }
        } else {
          // Use regular API
          const response = await sendMessageApi(conversationId, message);

          const aiMessage: InterviewMessage = {
            role: 'assistant',
            content: response.aiResponse,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, aiMessage]);

          setProgress(response.progress);

          if (response.isComplete) {
            setIsComplete(true);
            setStatus('COMPLETED');
            const summaryData = await getInterviewSummary();
            setSummary(summaryData);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        // Remove the optimistic user message on error
        setMessages((prev) => prev.slice(0, -1));
        setIsStreaming(false);
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, messages.length],
  );

  const skipQuestion = useCallback(async () => {
    if (!conversationId) {
      setError('No active conversation');
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      const response = await skipQuestionApi(conversationId);

      // Add AI response
      const aiMessage: InterviewMessage = {
        role: 'assistant',
        content: response.aiResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      setProgress(response.progress);

      if (response.isComplete) {
        setIsComplete(true);
        setStatus('COMPLETED');
        const summaryData = await getInterviewSummary();
        setSummary(summaryData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip question');
    } finally {
      setIsSending(false);
    }
  }, [conversationId]);

  const completeEarly = useCallback(async () => {
    if (!conversationId) {
      setError('No active conversation');
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      const response = await completeInterviewApi(conversationId);

      const aiMessage: InterviewMessage = {
        role: 'assistant',
        content: response.aiResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      setIsComplete(true);
      setStatus('COMPLETED');

      const summaryData = await getInterviewSummary();
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete interview');
    } finally {
      setIsSending(false);
    }
  }, [conversationId]);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const summaryData = await getInterviewSummary();
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startVoiceSession = useCallback(
    async (mode: 'BROWSER_VOICE' | 'PHONE_CALL', phoneNumber?: string) => {
      if (!conversationId) {
        setError('No active conversation');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const session = await startVoiceSessionApi(conversationId, mode, phoneNumber);
        setVoiceSession(session);
        setIsVoiceActive(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start voice session');
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId],
  );

  const endVoiceSession = useCallback(() => {
    setVoiceSession(null);
    setIsVoiceActive(false);
  }, []);

  return {
    messages,
    progress,
    isLoading,
    isSending,
    isStreaming,
    error,
    isComplete,
    summary,
    conversationId,
    canResume,
    status,
    voiceSession,
    isVoiceActive,
    checkStatus,
    start,
    sendMessage,
    skipQuestion,
    completeEarly,
    loadSummary,
    startVoiceSession,
    endVoiceSession,
  };
}
