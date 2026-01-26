import { fetchWithAuth, getApiUrl } from './client';

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

export interface CreateServiceData {
  name: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
}

export async function getServices(): Promise<Service[]> {
  return fetchWithAuth(getApiUrl('/services'));
}

export async function getService(id: string): Promise<Service> {
  return fetchWithAuth(getApiUrl(`/services/${id}`));
}

export async function createService(data: CreateServiceData): Promise<Service> {
  return fetchWithAuth(getApiUrl('/services'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateService(
  id: string,
  data: Partial<CreateServiceData>
): Promise<Service> {
  return fetchWithAuth(getApiUrl(`/services/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteService(id: string): Promise<void> {
  return fetchWithAuth(getApiUrl(`/services/${id}`), {
    method: 'DELETE',
  });
}

export async function createServices(
  services: Array<{ name: string; duration: number; price: number }>
): Promise<Service[]> {
  const results: Service[] = [];
  for (const service of services) {
    if (service.name.trim()) {
      const created = await createService({
        name: service.name,
        durationMinutes: service.duration,
        price: service.price,
      });
      results.push(created);
    }
  }
  return results;
}
