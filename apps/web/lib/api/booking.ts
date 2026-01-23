// Public booking API functions - no authentication required

import { Service, TimeSlot, CustomerInfo, Tenant } from '@/lib/types/booking';

// Re-export types for convenience
export type { TimeSlot };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function getTenantBySlug(slug: string): Promise<Tenant> {
  const response = await fetch(`${API_BASE_URL}/public/tenants/slug/${slug}`);

  if (!response.ok) {
    throw new Error('Business not found');
  }

  return response.json();
}

export async function getPublicServices(tenantId: string): Promise<Service[]> {
  const response = await fetch(`${API_BASE_URL}/public/tenants/${tenantId}/services`);

  if (!response.ok) {
    throw new Error('Failed to load services');
  }

  return response.json();
}

export async function getAvailableTimeSlots(
  tenantId: string,
  serviceId: string,
  date: Date
): Promise<TimeSlot[]> {
  const dateStr = date.toISOString().split('T')[0];
  const response = await fetch(
    `${API_BASE_URL}/public/tenants/${tenantId}/services/${serviceId}/slots?date=${dateStr}`
  );

  if (!response.ok) {
    throw new Error('Failed to load available time slots');
  }

  return response.json();
}

export async function createPublicBooking(
  tenantId: string,
  data: {
    serviceId: string;
    scheduledAt: string;
    customer: CustomerInfo;
  }
): Promise<{ id: string; confirmationCode: string; manageToken: string; success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/public/tenants/${tenantId}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create booking' }));
    throw new Error(error.message || 'Failed to create booking');
  }

  return response.json();
}

export interface BookingDetails {
  id: string;
  status: string;
  scheduledAt: string;
  duration: number;
  confirmationCode: string;
  service: {
    name: string;
    description?: string;
    price?: number;
  } | null;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  tenant: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export async function getBookingByToken(token: string): Promise<BookingDetails> {
  const response = await fetch(`${API_BASE_URL}/public/bookings/${token}`);

  if (!response.ok) {
    throw new Error('Booking not found');
  }

  return response.json();
}

export async function cancelBooking(
  token: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/public/bookings/${token}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to cancel booking' }));
    throw new Error(error.message || 'Failed to cancel booking');
  }

  return response.json();
}

export async function rescheduleBooking(
  token: string,
  scheduledAt: string
): Promise<{ success: boolean; message: string; newScheduledAt: string }> {
  const response = await fetch(`${API_BASE_URL}/public/bookings/${token}/reschedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scheduledAt }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to reschedule booking' }));
    throw new Error(error.message || 'Failed to reschedule booking');
  }

  return response.json();
}

export async function getAvailableSlotsForReschedule(
  token: string,
  date: Date
): Promise<TimeSlot[]> {
  const dateStr = date.toISOString().split('T')[0];
  const response = await fetch(
    `${API_BASE_URL}/public/bookings/${token}/available-slots?date=${dateStr}`
  );

  if (!response.ok) {
    throw new Error('Failed to load available time slots');
  }

  return response.json();
}
