import { DispatchAppointment, DispatchTechnician } from '@/lib/types/dispatch';

function firstValue<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value) => value !== undefined && value !== null) as T | undefined;
}

function isTechnician(role?: string) {
  return String(role || '').toLowerCase() === 'technician';
}

export function toInputDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return { start, end };
}

export function normalizeAppointment(appointment: any): DispatchAppointment {
  const customer = appointment.customer ?? {};
  const service = appointment.service ?? {};
  const scheduledAt = firstValue(appointment.scheduled_at, appointment.scheduledAt);
  const durationMinutes = Number(
    firstValue(appointment.duration_minutes, appointment.duration, appointment.durationMinutes, 60),
  );
  const customerName =
    firstValue(
      customer.name,
      [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim(),
      appointment.customer_name,
    ) || 'Unknown customer';
  const serviceName =
    firstValue(service.name, appointment.service_name, appointment.service) || 'Service';
  const technicianId = firstValue(
    appointment.technician_id,
    appointment.assignedTo,
    appointment.assigned_to,
    appointment.assignedUser?.id,
    appointment.technician?.id,
  );
  const serviceId = firstValue(appointment.service_id, appointment.serviceId, service.id);

  return {
    id: String(appointment.id),
    scheduledAt: scheduledAt ? String(scheduledAt) : new Date().toISOString(),
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 60,
    status: String(firstValue(appointment.status, 'SCHEDULED')),
    customerName,
    serviceName,
    technicianId: technicianId ? String(technicianId) : undefined,
    serviceId: serviceId ? String(serviceId) : undefined,
  };
}

export function normalizeTechnicians(members: any[]): DispatchTechnician[] {
  return members
    .filter((member) => isTechnician(member.role))
    .map((member) => ({
      id: String(member.id),
      name:
        String(
          firstValue(
            member.name,
            [member.first_name, member.last_name].filter(Boolean).join(' ').trim(),
            member.email,
            'Technician',
          ),
        ) || 'Technician',
      status: String(firstValue(member.status, member.state, 'active')),
    }));
}
