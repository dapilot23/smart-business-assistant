'use client';

import { useState, useEffect } from 'react';
import { Appointment } from '@/lib/types/appointment';
import { CalendarHeader } from './calendar-header';
import { CalendarDayView } from './calendar-day-view';
import { CalendarWeekView } from './calendar-week-view';
import { CalendarMobileView } from './calendar-mobile-view';

interface CalendarProps {
  appointments: Appointment[];
  onSlotClick: (dateTime: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  defaultView?: 'week' | 'day';
}

export function Calendar({
  appointments,
  onSlotClick,
  onAppointmentClick,
  defaultView = 'week',
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>(defaultView);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div>
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onViewChange={setView}
      />

      {isMobile ? (
        <CalendarMobileView
          date={currentDate}
          appointments={appointments}
          onSlotClick={onSlotClick}
          onAppointmentClick={onAppointmentClick}
        />
      ) : view === 'week' ? (
        <CalendarWeekView
          currentDate={currentDate}
          appointments={appointments}
          onSlotClick={onSlotClick}
          onAppointmentClick={onAppointmentClick}
        />
      ) : (
        <CalendarDayView
          date={currentDate}
          appointments={appointments}
          onSlotClick={onSlotClick}
          onAppointmentClick={onAppointmentClick}
        />
      )}
    </div>
  );
}
