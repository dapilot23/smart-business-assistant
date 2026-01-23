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
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b px-4 py-2">
        <div className="text-sm font-medium">
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
              <div className="px-2 py-3 text-xs text-gray-500 border-b border-gray-200 text-right">
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
