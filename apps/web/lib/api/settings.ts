import { fetchWithAuth, getApiUrl } from './client';

export interface BusinessHours {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface Settings {
  businessName?: string;
  timezone: string;
  businessHours: BusinessHours[];
  notifications: {
    sendReminders: boolean;
    reminderHoursBefore: number;
    autoConfirmBookings: boolean;
  };
  reviews: {
    enabled: boolean;
    hoursAfterCompletion: number;
    googleUrl?: string;
    yelpUrl?: string;
  };
}

export async function getSettings(): Promise<Settings> {
  return fetchWithAuth(getApiUrl('/settings'));
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  return fetchWithAuth(getApiUrl('/settings'), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
