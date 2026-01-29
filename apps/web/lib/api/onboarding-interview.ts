import { fetchWithAuth } from './client';

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

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await fetchWithAuth(
    `${BASE_URL}/api/v1/onboarding-interview/status`,
  );
  if (!response.ok) {
    throw new Error('Failed to get onboarding status');
  }
  return response.json();
}

export async function startInterview(
  resume = false,
): Promise<StartInterviewResponse> {
  const response = await fetchWithAuth(
    `${BASE_URL}/api/v1/onboarding-interview/start`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume }),
    },
  );
  if (!response.ok) {
    throw new Error('Failed to start interview');
  }
  return response.json();
}

export async function sendMessage(
  conversationId: string,
  message: string,
): Promise<MessageResponse> {
  const response = await fetchWithAuth(
    `${BASE_URL}/api/v1/onboarding-interview/message`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message }),
    },
  );
  if (!response.ok) {
    throw new Error('Failed to send message');
  }
  return response.json();
}

export async function skipQuestion(
  conversationId: string,
): Promise<MessageResponse> {
  const response = await fetchWithAuth(
    `${BASE_URL}/api/v1/onboarding-interview/skip`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    },
  );
  if (!response.ok) {
    throw new Error('Failed to skip question');
  }
  return response.json();
}

export async function completeInterview(
  conversationId: string,
): Promise<MessageResponse> {
  const response = await fetchWithAuth(
    `${BASE_URL}/api/v1/onboarding-interview/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    },
  );
  if (!response.ok) {
    throw new Error('Failed to complete interview');
  }
  return response.json();
}

export async function getInterviewSummary(): Promise<InterviewSummary | null> {
  const response = await fetchWithAuth(
    `${BASE_URL}/api/v1/onboarding-interview/summary`,
  );
  if (!response.ok) {
    throw new Error('Failed to get summary');
  }
  return response.json();
}

export async function getConversation(): Promise<InterviewMessage[]> {
  const response = await fetchWithAuth(
    `${BASE_URL}/api/v1/onboarding-interview/conversation`,
  );
  if (!response.ok) {
    throw new Error('Failed to get conversation');
  }
  return response.json();
}
