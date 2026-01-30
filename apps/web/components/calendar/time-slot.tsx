'use client';

import { cn } from '@/lib/utils';
import { Appointment } from '@/lib/types/appointment';
import { AlertTriangle } from 'lucide-react';

interface TimeSlotProps {
  hour: number;
  minute: number;
  date: Date;
  appointments: Appointment[];
  onSlotClick: (dateTime: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

function isHighRiskCustomer(noShowCount?: number): boolean {
  return (noShowCount ?? 0) >= 2;
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
        'w-full p-1 text-left text-xs border-b border-border',
        'hover:bg-secondary/50 transition-colors cursor-pointer min-h-[3rem]',
        slotAppointments.length > 0 && 'bg-primary/10 hover:bg-primary/20'
      )}
    >
      {slotAppointments.map((apt) => {
        const highRisk = apt.customer && isHighRiskCustomer(apt.customer.noShowCount);
        return (
          <div
            key={apt.id}
            className={cn(
              "text-xs font-medium truncate rounded px-1 py-0.5 mb-0.5 flex items-center gap-1",
              highRisk
                ? "text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/50"
                : "text-primary bg-primary/20"
            )}
          >
            {highRisk && <AlertTriangle className="h-3 w-3 flex-shrink-0" />}
            <span className="truncate">
              {apt.customer ? `${apt.customer.first_name} ${apt.customer.last_name}` : 'Unknown'}
            </span>
          </div>
        );
      })}
    </button>
  );
}
