import {
  Appointment,
  CreateAppointmentData,
  UpdateAppointmentData,
  Customer,
  Service,
  Technician
} from '@/lib/types/appointment';

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

export async function getAppointments(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<Appointment[]> {
  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.set('start_date', params.start_date);
  if (params?.end_date) queryParams.set('end_date', params.end_date);

  const url = `${API_URL}/appointments${queryParams.toString() ? `?${queryParams}` : ''}`;
  return fetchWithAuth(url);
}

export async function getAppointment(id: string): Promise<Appointment> {
  return fetchWithAuth(`${API_URL}/appointments/${id}`);
}

export async function createAppointment(data: CreateAppointmentData): Promise<Appointment> {
  return fetchWithAuth(`${API_URL}/appointments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAppointment(
  id: string,
  data: UpdateAppointmentData
): Promise<Appointment> {
  return fetchWithAuth(`${API_URL}/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAppointment(id: string): Promise<void> {
  return fetchWithAuth(`${API_URL}/appointments/${id}`, {
    method: 'DELETE',
  });
}

export async function getCustomers(): Promise<Customer[]> {
  return fetchWithAuth(`${API_URL}/customers`);
}

export async function getServices(): Promise<Service[]> {
  return fetchWithAuth(`${API_URL}/services`);
}

export async function getTechnicians(): Promise<Technician[]> {
  // Get team members - all can be assigned to appointments
  return fetchWithAuth(`${API_URL}/team`);
}
