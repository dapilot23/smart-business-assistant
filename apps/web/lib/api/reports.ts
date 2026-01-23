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

export interface DashboardStats {
  revenue: {
    current: number;
    previous: number;
    change: number;
  };
  appointments: {
    current: number;
    previous: number;
    change: number;
  };
  customers: {
    total: number;
    active: number;
  };
  calls: {
    total: number;
    handled: number;
  };
  quotes: {
    pending: number;
    total: number;
  };
  jobs: {
    inProgress: number;
    total: number;
  };
}

export interface RevenueDataPoint {
  date: string;
  amount: number;
}

export interface AppointmentStats {
  status: string;
  count: number;
}

export interface TopService {
  name: string;
  count: number;
  revenue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchWithAuth(`${API_URL}/reports/dashboard`);
}

export async function getRevenueChart(period: string = '30d'): Promise<RevenueDataPoint[]> {
  return fetchWithAuth(`${API_URL}/reports/revenue?period=${period}`);
}

export async function getAppointmentStats(period: string = '30d'): Promise<AppointmentStats[]> {
  return fetchWithAuth(`${API_URL}/reports/appointments?period=${period}`);
}

export async function getTopServices(): Promise<TopService[]> {
  return fetchWithAuth(`${API_URL}/reports/services`);
}
