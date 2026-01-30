export interface Appointment {
  id: string;
  customer_id: string;
  service_id: string;
  technician_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    noShowCount?: number;
  };
  service?: {
    id: string;
    name: string;
    duration_minutes: number;
  };
  technician?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentData {
  customer_id: string;
  service_id: string;
  technician_id?: string;
  scheduled_at: string;
  notes?: string;
}

export interface UpdateAppointmentData {
  customer_id?: string;
  service_id?: string;
  technician_id?: string;
  scheduled_at?: string;
  status?: Appointment['status'];
  notes?: string;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

export interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}
