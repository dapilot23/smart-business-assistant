import {
  Appointment,
  CreateAppointmentData,
  UpdateAppointmentData,
  Customer,
  Service,
  Technician
} from '@/lib/types/appointment';
import { fetchWithAuth, getApiUrl } from './client';

export async function getAppointments(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<Appointment[]> {
  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.set('start_date', params.start_date);
  if (params?.end_date) queryParams.set('end_date', params.end_date);

  const url = getApiUrl(`/appointments${queryParams.toString() ? `?${queryParams}` : ''}`);
  return fetchWithAuth(url);
}

export async function getAppointment(id: string): Promise<Appointment> {
  return fetchWithAuth(getApiUrl(`/appointments/${id}`));
}

export async function createAppointment(data: CreateAppointmentData): Promise<Appointment> {
  return fetchWithAuth(getApiUrl('/appointments'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAppointment(
  id: string,
  data: UpdateAppointmentData
): Promise<Appointment> {
  return fetchWithAuth(getApiUrl(`/appointments/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAppointment(id: string): Promise<void> {
  return fetchWithAuth(getApiUrl(`/appointments/${id}`), {
    method: 'DELETE',
  });
}

export async function getCustomers(): Promise<Customer[]> {
  return fetchWithAuth(getApiUrl('/customers'));
}

export async function getServices(): Promise<Service[]> {
  return fetchWithAuth(getApiUrl('/services'));
}

export async function getTechnicians(): Promise<Technician[]> {
  // Get team members - all can be assigned to appointments
  return fetchWithAuth(getApiUrl('/team'));
}
