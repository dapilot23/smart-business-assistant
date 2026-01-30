import { fetchWithAuth, getApiUrl } from './client';

export interface ReviewRequest {
  id: string;
  status: 'PENDING' | 'SENT' | 'CLICKED' | 'SKIPPED';
  platform: string | null;
  npsGated: boolean;
  npsScore: number | null;
  sentAt: string | null;
  clickedAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
}

export interface PlatformBreakdown {
  platform: string;
  clickCount: number;
}

export interface WeeklyVelocity {
  weekStart: string;
  count: number;
}

export interface ReputationDashboard {
  totalRequests: number;
  sentCount: number;
  clickedCount: number;
  clickRate: number;
  npsGatedStats: {
    sent: number;
    clicked: number;
    conversionRate: number;
  };
  platformBreakdown: PlatformBreakdown[];
  recentRequests: ReviewRequest[];
}

export async function getReputationDashboard(): Promise<ReputationDashboard> {
  return fetchWithAuth(getApiUrl('/review-requests/reputation'));
}

export async function getReviewVelocity(weeks = 12): Promise<WeeklyVelocity[]> {
  return fetchWithAuth(getApiUrl(`/review-requests/reputation/velocity?weeks=${weeks}`));
}

export async function getPlatformBreakdown(): Promise<PlatformBreakdown[]> {
  return fetchWithAuth(getApiUrl('/review-requests/reputation/platforms'));
}
