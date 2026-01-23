'use client';

import { Appointment } from '@/lib/types/appointment';
import { getStatusColor } from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: (appointment: Appointment) => void;
}

export function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  const startTime = new Date(appointment.scheduled_at);
  const endTime = new Date(startTime.getTime() + appointment.duration_minutes * 60000);

  const formatTimeShort = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <button
      onClick={() => onClick(appointment)}
      className={cn(
        'w-full p-2 rounded-md border text-left transition-all hover:shadow-md',
        getStatusColor(appointment.status)
      )}
    >
      <div className="font-semibold text-sm truncate">
        {appointment.customer
          ? `${appointment.customer.first_name} ${appointment.customer.last_name}`
          : 'Unknown Customer'}
      </div>
      <div className="text-xs opacity-90 mt-1">
        {formatTimeShort(startTime)} - {formatTimeShort(endTime)}
      </div>
      {appointment.service && (
        <div className="text-xs opacity-80 mt-1 truncate">
          {appointment.service.name}
        </div>
      )}
    </button>
  );
}
