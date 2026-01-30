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
