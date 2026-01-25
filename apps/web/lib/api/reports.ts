import { fetchWithAuth, getApiUrl } from './client';

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
  return fetchWithAuth(getApiUrl('/reports/dashboard'));
}

export async function getRevenueChart(period: string = '30d'): Promise<RevenueDataPoint[]> {
  return fetchWithAuth(getApiUrl(`/reports/revenue?period=${period}`));
}

export async function getAppointmentStats(period: string = '30d'): Promise<AppointmentStats[]> {
  return fetchWithAuth(getApiUrl(`/reports/appointments?period=${period}`));
}

export async function getTopServices(): Promise<TopService[]> {
  return fetchWithAuth(getApiUrl('/reports/services'));
}
