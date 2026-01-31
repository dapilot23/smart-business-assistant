import { fetchWithAuth, getApiUrl } from './client';
import { OptimizedRouteResult, TechnicianScore } from '@/lib/types/dispatch';

export async function findBestTechnicians(params: {
  serviceId: string;
  date: string;
  lat?: number;
  lng?: number;
}): Promise<TechnicianScore[]> {
  return fetchWithAuth(getApiUrl('/ai-scheduling/dispatch/best-technician'), {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function optimizeRoute(
  technicianId: string,
  date?: string,
): Promise<OptimizedRouteResult> {
  return fetchWithAuth(getApiUrl(`/ai-scheduling/routes/${technicianId}/optimize`), {
    method: 'POST',
    body: JSON.stringify(date ? { date } : {}),
  });
}

export async function getOptimizedRoute(
  technicianId: string,
  date?: string,
): Promise<OptimizedRouteResult> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchWithAuth(getApiUrl(`/ai-scheduling/routes/${technicianId}${query}`));
}
