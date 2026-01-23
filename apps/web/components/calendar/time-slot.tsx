'use client';

import { cn } from '@/lib/utils';
import { Appointment } from '@/lib/types/appointment';

interface TimeSlotProps {
  hour: number;
  minute: number;
  date: Date;
  appointments: Appointment[];
  onSlotClick: (dateTime: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function TimeSlot({
  hour,
  minute,
  date,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: TimeSlotProps) {
  const slotDateTime = new Date(date);
  slotDateTime.setHours(hour, minute, 0, 0);

  const slotAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.scheduled_at);
    return (
      aptDate.getHours() === hour &&
      aptDate.getMinutes() === minute &&
      aptDate.toDateString() === date.toDateString()
    );
  });

  const handleClick = () => {
    if (slotAppointments.length > 0) {
      onAppointmentClick(slotAppointments[0]);
    } else {
      onSlotClick(slotDateTime);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full p-1 text-left text-xs border-b border-gray-200',
        'hover:bg-gray-50 transition-colors cursor-pointer min-h-[3rem]',
        slotAppointments.length > 0 && 'bg-blue-50 hover:bg-blue-100'
      )}
    >
      {slotAppointments.map((apt) => (
        <div
          key={apt.id}
          className="text-xs font-medium truncate text-blue-900"
        >
          {apt.customer ? `${apt.customer.first_name} ${apt.customer.last_name}` : 'Unknown'}
        </div>
      ))}
    </button>
  );
}
