import {
  WeeklySchedule,
  TimeOff,
  CreateWeeklyScheduleData,
  CreateTimeOffData,
  UpdateTimeOffData,
} from '@/lib/types/availability';
import { fetchWithAuth, getApiUrl } from './client';

// Schedule endpoints
export async function getSchedule(userId?: string): Promise<WeeklySchedule[]> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  const queryString = params.toString();
  const url = getApiUrl(`/availability/schedule${queryString ? `?${queryString}` : ''}`);
  return fetchWithAuth(url);
}

export async function getScheduleById(id: string): Promise<WeeklySchedule> {
  return fetchWithAuth(getApiUrl(`/availability/schedule/${id}`));
}

export async function createSchedule(data: CreateWeeklyScheduleData): Promise<WeeklySchedule> {
  return fetchWithAuth(getApiUrl('/availability/schedule'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSchedule(
  id: string,
  data: Partial<CreateWeeklyScheduleData>
): Promise<WeeklySchedule> {
  return fetchWithAuth(getApiUrl(`/availability/schedule/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  return fetchWithAuth(getApiUrl(`/availability/schedule/${id}`), {
    method: 'DELETE',
  });
}

// Time off endpoints
export async function getTimeOffs(userId?: string): Promise<TimeOff[]> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  const queryString = params.toString();
  const url = getApiUrl(`/availability/time-off${queryString ? `?${queryString}` : ''}`);
  return fetchWithAuth(url);
}

export async function getTimeOffById(id: string): Promise<TimeOff> {
  return fetchWithAuth(getApiUrl(`/availability/time-off/${id}`));
}

export async function createTimeOff(data: CreateTimeOffData): Promise<TimeOff> {
  return fetchWithAuth(getApiUrl('/availability/time-off'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTimeOff(
  id: string,
  data: UpdateTimeOffData
): Promise<TimeOff> {
  return fetchWithAuth(getApiUrl(`/availability/time-off/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTimeOff(id: string): Promise<void> {
  return fetchWithAuth(getApiUrl(`/availability/time-off/${id}`), {
    method: 'DELETE',
  });
}
