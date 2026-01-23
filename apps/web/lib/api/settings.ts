const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchWithAuth(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

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
  return fetchWithAuth(`${API_URL}/settings`);
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  return fetchWithAuth(`${API_URL}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
