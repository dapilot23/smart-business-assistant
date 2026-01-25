'use client';

import { Appointment } from '@/lib/types/appointment';
import { generateTimeSlots, getWeekDays, formatDate } from '@/lib/calendar-utils';
import { TimeSlot } from './time-slot';

interface CalendarWeekViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onSlotClick: (dateTime: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function CalendarWeekView({
  currentDate,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(currentDate);
  const timeSlots = generateTimeSlots(8, 18, 30);
  const today = new Date();

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header row with days */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border bg-secondary/50">
        <div className="px-2 py-3 text-xs font-medium text-muted-foreground"></div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`px-2 py-3 text-center border-l border-border ${
              isToday(day) ? 'bg-primary/10' : ''
            }`}
          >
            <div className={`text-xs font-medium ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
              {formatDate(day)}
            </div>
            {isToday(day) && (
              <div className="w-2 h-2 rounded-full bg-primary mx-auto mt-1" />
            )}
          </div>
        ))}
      </div>

      {/* Time slots grid */}
      <div className="overflow-y-auto max-h-[600px]">
        {timeSlots.map((slot) => (
          <div
            key={`${slot.hour}-${slot.minute}`}
            className="grid grid-cols-[80px_repeat(7,1fr)]"
          >
            <div className="px-2 py-3 text-xs text-muted-foreground border-b border-border text-right">
              {slot.label}
            </div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className={`border-l border-border ${isToday(day) ? 'bg-primary/5' : ''}`}>
                <TimeSlot
                  hour={slot.hour}
                  minute={slot.minute}
                  date={day}
                  appointments={appointments}
                  onSlotClick={onSlotClick}
                  onAppointmentClick={onAppointmentClick}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
