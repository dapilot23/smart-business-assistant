"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DispatchAppointment, DispatchTechnician } from '@/lib/types/dispatch';
import { formatStatus, formatTime, statusBadgeClass } from './dispatch-utils';

interface TechnicianAssignmentsProps {
  technicians: DispatchTechnician[];
  appointments: DispatchAppointment[];
  selectedTechnicianId: string | null;
  onSelectTechnician: (technicianId: string) => void;
}

export function TechnicianAssignments({
  technicians,
  appointments,
  selectedTechnicianId,
  onSelectTechnician,
}: TechnicianAssignmentsProps) {
  const appointmentsByTechnician = useMemo(() => {
    const grouped: Record<string, DispatchAppointment[]> = {};
    appointments.forEach((appointment) => {
      if (!appointment.technicianId) return;
      grouped[appointment.technicianId] = grouped[appointment.technicianId] || [];
      grouped[appointment.technicianId].push(appointment);
    });
    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    });
    return grouped;
  }, [appointments]);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Today&apos;s Assignments</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Select a technician to view optimized routing and metrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {technicians.length === 0 ? (
          <div className="text-sm text-muted-foreground">No technicians available.</div>
        ) : (
          technicians.map((technician) => (
            <TechnicianCard
              key={technician.id}
              technician={technician}
              appointments={appointmentsByTechnician[technician.id] || []}
              active={technician.id === selectedTechnicianId}
              onSelect={() => onSelectTechnician(technician.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TechnicianCard({
  technician,
  appointments,
  active,
  onSelect,
}: {
  technician: DispatchTechnician;
  appointments: DispatchAppointment[];
  active: boolean;
  onSelect: () => void;
}) {
  const totalMinutes = appointments.reduce((sum, appointment) => sum + appointment.durationMinutes, 0);
  const hoursScheduled = totalMinutes > 0 ? Math.max(1, Math.round(totalMinutes / 60)) : 0;
  const activeStyles = active
    ? 'border-primary/60 bg-primary/10'
    : 'border-border hover:border-primary/30 hover:bg-secondary/40';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border px-4 py-3 transition ${activeStyles}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{technician.name}</p>
          <p className="text-xs text-muted-foreground">
            {appointments.length} jobs • {hoursScheduled} hrs scheduled
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] uppercase">
          {technician.status || 'active'}
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        {appointments.length === 0 ? (
          <div className="text-xs text-muted-foreground">No jobs assigned yet.</div>
        ) : (
          appointments.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} />
          ))
        )}
      </div>
    </button>
  );
}

function AppointmentRow({ appointment }: { appointment: DispatchAppointment }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-background/60 px-3 py-2">
      <div>
        <p className="text-xs font-medium text-foreground">
          {formatTime(appointment.scheduledAt)} · {appointment.customerName}
        </p>
        <p className="text-[11px] text-muted-foreground">{appointment.serviceName}</p>
      </div>
      <span
        className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusBadgeClass(
          appointment.status,
        )}`}
      >
        {formatStatus(appointment.status)}
      </span>
    </div>
  );
}
