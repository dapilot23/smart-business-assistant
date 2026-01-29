import { fetchWithAuth, getApiUrl } from './client';

// Campaign types
export type CampaignType = 'SMS_BLAST' | 'EMAIL_BLAST' | 'DRIP_SEQUENCE' | 'REFERRAL' | 'SEASONAL';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  channel?: string;
  subject?: string;
  content?: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  conversionCount: number;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  audienceSegment?: AudienceSegment;
}

export interface CampaignStats {
  sentCount: number;
  deliveredCount: number;
  openCount: number;
  clickCount: number;
  conversionCount: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  type: CampaignType;
  audienceSegmentId?: string;
  channel?: string;
  subject?: string;
  content?: string;
  senderName?: string;
  scheduledAt?: string;
}

// Segment types
export interface SegmentCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'notIn';
  value: unknown;
}

export interface SegmentRules {
  conditions: SegmentCondition[];
  logic: 'AND' | 'OR';
}

export interface AudienceSegment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRules;
  memberCount: number;
  aiGenerated: boolean;
  createdAt: string;
}

export interface CreateSegmentData {
  name: string;
  description?: string;
  rules: SegmentRules;
}

export interface SegmentField {
  name: string;
  label: string;
  type: string;
  operators: string[];
}

// Referral types
export interface Referral {
  id: string;
  referrerId: string;
  referrerCode: string;
  referredId?: string;
  referredEmail?: string;
  referredPhone?: string;
  status: 'PENDING' | 'CONVERTED' | 'REWARDED' | 'EXPIRED';
  referrerReward?: string;
  referredReward?: string;
  createdAt: string;
  convertedAt?: string;
  referrer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  referred?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface ReferralSettings {
  isEnabled: boolean;
  referrerRewardType: string;
  referrerRewardValue: number;
  referredRewardType: string;
  referredRewardValue: number;
  maxReferralsPerCustomer?: number;
  referralExpiryDays: number;
  minPurchaseForReward?: number;
}

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  rewardedReferrals: number;
  totalRewardsIssued: number;
}

export interface TopReferrer {
  customerId: string;
  customerName: string;
  referralCount: number;
  convertedCount: number;
}

// Campaign APIs
export async function getCampaigns(filters?: {
  status?: CampaignStatus;
  type?: CampaignType;
}): Promise<Campaign[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.type) params.set('type', filters.type);
  const query = params.toString();
  return fetchWithAuth(getApiUrl(`/marketing/campaigns${query ? `?${query}` : ''}`));
}

export async function getCampaign(id: string): Promise<Campaign> {
  return fetchWithAuth(getApiUrl(`/marketing/campaigns/${id}`));
}

export async function createCampaign(data: CreateCampaignData): Promise<Campaign> {
  return fetchWithAuth(getApiUrl('/marketing/campaigns'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCampaign(id: string, data: Partial<CreateCampaignData>): Promise<Campaign> {
  return fetchWithAuth(getApiUrl(`/marketing/campaigns/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  return fetchWithAuth(getApiUrl(`/marketing/campaigns/${id}`), {
    method: 'DELETE',
  });
}

export async function scheduleCampaign(id: string, scheduledAt: Date): Promise<Campaign> {
  return fetchWithAuth(getApiUrl(`/marketing/campaigns/${id}/schedule`), {
    method: 'POST',
    body: JSON.stringify({ scheduledAt }),
  });
}

export async function sendCampaign(id: string): Promise<Campaign> {
  return fetchWithAuth(getApiUrl(`/marketing/campaigns/${id}/send`), {
    method: 'POST',
  });
}

export async function pauseCampaign(id: string): Promise<Campaign> {
  return fetchWithAuth(getApiUrl(`/marketing/campaigns/${id}/pause`), {
    method: 'POST',
  });
}

export async function resumeCampaign(id: string): Promise<Campaign> {
  return fetchWithAuth(getApiUrl(`/marketing/campaigns/${id}/resume`), {
    method: 'POST',
  });
}

export async function cancelCampaign(id: string): Promise<Campaign> {
  return fetchWithAuth(getApiUrl(`/marketing/campaigns/${id}/cancel`), {
    method: 'POST',
  });
}

export async function getCampaignStats(id: string): Promise<CampaignStats> {
  return fetchWithAuth(getApiUrl(`/marketing/campaigns/${id}/stats`));
}

// Segment APIs
export async function getSegments(): Promise<AudienceSegment[]> {
  return fetchWithAuth(getApiUrl('/marketing/segments'));
}

export async function getSegment(id: string): Promise<AudienceSegment> {
  return fetchWithAuth(getApiUrl(`/marketing/segments/${id}`));
}

export async function createSegment(data: CreateSegmentData): Promise<AudienceSegment> {
  return fetchWithAuth(getApiUrl('/marketing/segments'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSegment(id: string, data: Partial<CreateSegmentData>): Promise<AudienceSegment> {
  return fetchWithAuth(getApiUrl(`/marketing/segments/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSegment(id: string): Promise<void> {
  return fetchWithAuth(getApiUrl(`/marketing/segments/${id}`), {
    method: 'DELETE',
  });
}

export async function getSegmentMembers(id: string): Promise<{ customers: unknown[]; count: number }> {
  return fetchWithAuth(getApiUrl(`/marketing/segments/${id}/members`));
}

export async function previewSegment(rules: SegmentRules): Promise<{ customers: unknown[]; count: number }> {
  return fetchWithAuth(getApiUrl('/marketing/segments/preview'), {
    method: 'POST',
    body: JSON.stringify({ rules }),
  });
}

export async function getSupportedFields(): Promise<{ fields: SegmentField[] }> {
  return fetchWithAuth(getApiUrl('/marketing/segments/fields'));
}

// Referral APIs
export async function getReferralSettings(): Promise<ReferralSettings> {
  return fetchWithAuth(getApiUrl('/marketing/referrals/settings'));
}

export async function updateReferralSettings(settings: Partial<ReferralSettings>): Promise<ReferralSettings> {
  return fetchWithAuth(getApiUrl('/marketing/referrals/settings'), {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

export async function getReferralStats(): Promise<ReferralStats> {
  return fetchWithAuth(getApiUrl('/marketing/referrals/stats'));
}

export async function getReferrals(filters?: {
  status?: string;
  referrerId?: string;
}): Promise<Referral[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.referrerId) params.set('referrerId', filters.referrerId);
  const query = params.toString();
  return fetchWithAuth(getApiUrl(`/marketing/referrals${query ? `?${query}` : ''}`));
}

export async function getTopReferrers(limit?: number): Promise<TopReferrer[]> {
  const query = limit ? `?limit=${limit}` : '';
  return fetchWithAuth(getApiUrl(`/marketing/referrals/top-referrers${query}`));
}

export async function generateReferralCode(customerId: string): Promise<{ referralCode: string }> {
  return fetchWithAuth(getApiUrl('/marketing/referrals/generate'), {
    method: 'POST',
    body: JSON.stringify({ customerId }),
  });
}
