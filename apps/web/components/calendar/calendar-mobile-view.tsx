'use client';

import { Appointment } from '@/lib/types/appointment';
import { AppointmentCard } from './appointment-card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CalendarMobileViewProps {
  date: Date;
  appointments: Appointment[];
  onSlotClick: (dateTime: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function CalendarMobileView({
  date,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: CalendarMobileViewProps) {
  const dayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.scheduled_at);
    return aptDate.toDateString() === date.toDateString();
  });

  const sortedAppointments = [...dayAppointments].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h3>
        <Button size="sm" onClick={() => onSlotClick(date)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {sortedAppointments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-500 text-sm">No appointments scheduled</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onSlotClick(date)}
          >
            Schedule Appointment
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onClick={onAppointmentClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
