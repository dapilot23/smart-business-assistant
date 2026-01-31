import type { Appointment } from '@/lib/types/appointment';
import type { TeamMember } from '@/lib/types/team';
import { DispatchAppointment, DispatchTechnician } from '@/lib/types/dispatch';

type LooseRecord = Record<string, unknown>;
type AppointmentInput = Appointment | LooseRecord;
type TechnicianInput = TeamMember | LooseRecord;

function firstValue<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value) => value !== undefined && value !== null) as T | undefined;
}

function isTechnician(role?: unknown) {
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

export function normalizeAppointment(appointment: AppointmentInput): DispatchAppointment {
  const record = appointment as LooseRecord;
  const customer = (record['customer'] ?? {}) as LooseRecord;
  const service = (record['service'] ?? {}) as LooseRecord;
  const scheduledAt = firstValue(
    record['scheduled_at'] as string | undefined,
    record['scheduledAt'] as string | undefined,
  );
  const durationMinutes = Number(
    firstValue<number | string>(
      record['duration_minutes'] as number | string | undefined,
      record['duration'] as number | string | undefined,
      record['durationMinutes'] as number | string | undefined,
      60,
    ),
  );
  const customerFirstName = typeof customer['first_name'] === 'string' ? customer['first_name'] : '';
  const customerLastName = typeof customer['last_name'] === 'string' ? customer['last_name'] : '';
  const customerFullName = [customerFirstName, customerLastName].filter(Boolean).join(' ').trim();
  const customerName =
    firstValue(
      customer['name'] as string | undefined,
      customerFullName,
      record['customer_name'] as string | undefined,
    ) || 'Unknown customer';
  const serviceName =
    firstValue(
      service['name'] as string | undefined,
      record['service_name'] as string | undefined,
      record['service'] as string | undefined,
    ) || 'Service';
  const assignedUser = (record['assignedUser'] ?? {}) as LooseRecord;
  const technician = (record['technician'] ?? {}) as LooseRecord;
  const technicianId = firstValue(
    record['technician_id'] as string | number | undefined,
    record['assignedTo'] as string | number | undefined,
    record['assigned_to'] as string | number | undefined,
    assignedUser['id'] as string | number | undefined,
    technician['id'] as string | number | undefined,
  );
  const serviceId = firstValue(
    record['service_id'] as string | number | undefined,
    record['serviceId'] as string | number | undefined,
    service['id'] as string | number | undefined,
  );

  return {
    id: String(record['id']),
    scheduledAt: scheduledAt ? String(scheduledAt) : new Date().toISOString(),
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 60,
    status: String(firstValue(record['status'] as string | undefined, 'SCHEDULED')),
    customerName,
    serviceName,
    technicianId: technicianId ? String(technicianId) : undefined,
    serviceId: serviceId ? String(serviceId) : undefined,
  };
}

export function normalizeTechnicians(members: TechnicianInput[]): DispatchTechnician[] {
  return members
    .filter((member) => isTechnician((member as LooseRecord)['role']))
    .map((member) => {
      const record = member as LooseRecord;
      return {
        id: String(record['id']),
      name:
        String(
          firstValue(
            record['name'] as string | undefined,
            [
              typeof record['first_name'] === 'string' ? record['first_name'] : '',
              typeof record['last_name'] === 'string' ? record['last_name'] : '',
            ]
              .filter(Boolean)
              .join(' ')
              .trim(),
            record['email'] as string | undefined,
            'Technician',
          ),
        ) || 'Technician',
      status: String(firstValue(record['status'] as string | undefined, record['state'] as string | undefined, 'active')),
      };
    });
}
