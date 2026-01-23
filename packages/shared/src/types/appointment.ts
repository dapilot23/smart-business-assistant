/**
 * Appointment type definitions
 */

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export interface AppointmentReminder {
  type: 'email' | 'sms';
  minutesBefore: number;
  sent: boolean;
  sentAt?: Date;
}

export interface Appointment {
  id: string;
  tenantId: string;
  customerId: string;
  assignedToUserId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  reminders: AppointmentReminder[];
  notes?: string;
  jobId?: string;
  quoteId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AppointmentWithRelations extends Appointment {
  customerName: string;
  customerEmail: string;
  assignedToUserName?: string;
}

export interface CreateAppointmentDto {
  customerId: string;
  assignedToUserId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  reminders?: Omit<AppointmentReminder, 'sent' | 'sentAt'>[];
  notes?: string;
}
