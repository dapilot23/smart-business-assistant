"use client";

import { useState, useCallback } from 'react';
import {
  InterviewMessage,
  ProgressInfo,
  InterviewSummary,
  getOnboardingStatus,
  startInterview,
  sendMessage as sendMessageApi,
  skipQuestion as skipQuestionApi,
  completeInterview as completeInterviewApi,
  getInterviewSummary,
  getConversation,
} from '../api/onboarding-interview';

export interface UseOnboardingInterview {
  // State
  messages: InterviewMessage[];
  progress: ProgressInfo | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  isComplete: boolean;
  summary: InterviewSummary | null;
  conversationId: string | null;
  canResume: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | null;

  // Actions
  checkStatus: () => Promise<void>;
  start: (resume?: boolean) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  skipQuestion: () => Promise<void>;
  completeEarly: () => Promise<void>;
  loadSummary: () => Promise<void>;
}

export function useOnboardingInterview(): UseOnboardingInterview {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [canResume, setCanResume] = useState(false);
  const [status, setStatus] = useState<UseOnboardingInterview['status']>(null);

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
    async (message: string) => {
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

        const response = await sendMessageApi(conversationId, message);

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
          // Load the summary
          const summaryData = await getInterviewSummary();
          setSummary(summaryData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        // Remove the optimistic user message on error
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsSending(false);
      }
    },
    [conversationId],
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

  return {
    messages,
    progress,
    isLoading,
    isSending,
    error,
    isComplete,
    summary,
    conversationId,
    canResume,
    status,
    checkStatus,
    start,
    sendMessage,
    skipQuestion,
    completeEarly,
    loadSummary,
  };
}
