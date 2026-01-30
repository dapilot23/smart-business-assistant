import { fetchWithAuth, fetchStreamWithAuth } from './client';

export interface InterviewMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  questionId?: string;
}

export interface ProgressInfo {
  completed: number;
  total: number;
  percent: number;
  currentCategory: string | null;
  categories: Array<{
    category: string;
    label: string;
    completed: number;
    total: number;
  }>;
}

export interface OnboardingStatus {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  completedQuestions: number;
  totalQuestions: number;
  percentComplete: number;
  canResume: boolean;
}

export interface StartInterviewResponse {
  conversationId: string;
  businessProfileId: string;
  initialMessage: string;
  progress: ProgressInfo;
}

export interface MessageResponse {
  aiResponse: string;
  progress: ProgressInfo;
  isComplete: boolean;
  extractedData?: Record<string, unknown>;
}

export interface InterviewSummary {
  aiSummary: string;
  brandVoice: string;
  recommendations: Array<{
    title: string;
    description: string;
    feature: string;
  }>;
  profile: Record<string, unknown>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return fetchWithAuth(`${BASE_URL}/onboarding-interview/status`);
}

export async function startInterview(
  resume = false,
): Promise<StartInterviewResponse> {
  return fetchWithAuth(`${BASE_URL}/onboarding-interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume }),
  });
}

export async function sendMessage(
  conversationId: string,
  message: string,
): Promise<MessageResponse> {
  return fetchWithAuth(`${BASE_URL}/onboarding-interview/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message }),
  });
}

export async function skipQuestion(
  conversationId: string,
): Promise<MessageResponse> {
  return fetchWithAuth(`${BASE_URL}/onboarding-interview/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId }),
  });
}

export async function completeInterview(
  conversationId: string,
): Promise<MessageResponse> {
  return fetchWithAuth(`${BASE_URL}/onboarding-interview/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId }),
  });
}

export async function getInterviewSummary(): Promise<InterviewSummary | null> {
  return fetchWithAuth(`${BASE_URL}/onboarding-interview/summary`);
}

export async function getConversation(): Promise<InterviewMessage[]> {
  return fetchWithAuth(`${BASE_URL}/onboarding-interview/conversation`);
}

// ============================================
// Streaming API
// ============================================

export interface StreamEvent {
  type: 'text_delta' | 'extraction' | 'state' | 'done' | 'error';
  content?: string;
  field?: string;
  value?: unknown;
  confidence?: number;
  state?: string;
  progress?: ProgressInfo;
  nextQuestion?: string;
  isComplete?: boolean;
  inferredCount?: number;
  code?: string;
  message?: string;
}

export async function* sendMessageStream(
  conversationId: string,
  message: string,
  sessionId?: string,
): AsyncGenerator<StreamEvent, void, unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }

  const response = await fetchStreamWithAuth(`${BASE_URL}/onboarding-interview/message/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ conversationId, message }),
  });

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent: string | null = null;
      let currentData: string | null = null;

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6);
        } else if (line === '' && currentEvent && currentData) {
          try {
            const data = JSON.parse(currentData);
            yield { type: currentEvent, ...data } as StreamEvent;
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
          currentEvent = null;
          currentData = null;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ============================================
// Voice Interview API
// ============================================

export interface VoiceSessionConfig {
  sessionId: string;
  mode: 'BROWSER_VOICE' | 'PHONE_CALL';
  vapiConfig?: {
    assistantId: string;
    apiKey: string;
    callId?: string;
  };
  browserConfig?: {
    websocketUrl: string;
    token: string;
  };
}

export interface VoiceStatus {
  active: boolean;
  mode: string | null;
  callId: string | null;
  transcriptLength: number;
}

export async function startVoiceSession(
  conversationId: string,
  mode: 'BROWSER_VOICE' | 'PHONE_CALL',
  phoneNumber?: string,
): Promise<VoiceSessionConfig> {
  return fetchWithAuth(`${BASE_URL}/onboarding-interview/voice/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, mode, phoneNumber }),
  });
}

export async function getVoiceStatus(sessionId: string): Promise<VoiceStatus> {
  return fetchWithAuth(`${BASE_URL}/onboarding-interview/voice/status`, {
    headers: { 'x-session-id': sessionId },
  });
}
