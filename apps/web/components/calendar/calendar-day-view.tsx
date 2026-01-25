'use client';

import { Appointment } from '@/lib/types/appointment';
import { generateTimeSlots } from '@/lib/calendar-utils';
import { TimeSlot } from './time-slot';

interface CalendarDayViewProps {
  date: Date;
  appointments: Appointment[];
  onSlotClick: (dateTime: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function CalendarDayView({
  date,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: CalendarDayViewProps) {
  const timeSlots = generateTimeSlots(8, 18, 30);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="bg-secondary/50 border-b border-border px-4 py-3">
        <div className="text-sm font-medium text-foreground">
          {date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-[80px_1fr]">
          {timeSlots.map((slot) => (
            <div key={`${slot.hour}-${slot.minute}`} className="contents">
              <div className="px-2 py-3 text-xs text-muted-foreground border-b border-border text-right">
                {slot.label}
              </div>
              <TimeSlot
                hour={slot.hour}
                minute={slot.minute}
                date={date}
                appointments={appointments}
                onSlotClick={onSlotClick}
                onAppointmentClick={onAppointmentClick}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
