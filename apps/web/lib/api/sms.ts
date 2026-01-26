import { fetchWithAuth, getApiUrl } from './client';

export interface Broadcast {
  id: string;
  message: string;
  recipients: string[];
  sent_count: number;
  created_at: string;
  created_by_name: string;
}

export interface CreateBroadcastData {
  message: string;
  targetRoles: string[];
}

export async function getBroadcasts(): Promise<Broadcast[]> {
  return fetchWithAuth(getApiUrl('/sms/broadcasts'));
}

export async function getBroadcast(id: string): Promise<Broadcast> {
  return fetchWithAuth(getApiUrl(`/sms/broadcasts/${id}`));
}

export async function createBroadcast(data: CreateBroadcastData): Promise<Broadcast> {
  return fetchWithAuth(getApiUrl('/sms/broadcast'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSmsStatus(): Promise<{ configured: boolean; message: string }> {
  return fetchWithAuth(getApiUrl('/sms/status'));
}
