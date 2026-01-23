// Booking-related types for public booking flow

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price?: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface BookingData {
  serviceId: string;
  date: Date;
  time: string;
  customer: CustomerInfo;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
}
