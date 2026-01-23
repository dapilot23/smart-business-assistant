'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeSlotPicker } from './time-slot-picker';
import { WeeklySchedule, DAYS_OF_WEEK } from '@/lib/types/availability';

interface AvailabilityScheduleProps {
  technicianId: string;
  schedule: WeeklySchedule[];
  onSave: (schedule: Partial<WeeklySchedule>[]) => Promise<void>;
}

interface DaySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

function initializeSchedule(existingSchedule: WeeklySchedule[]): DaySchedule[] {
  const scheduleMap = new Map(
    existingSchedule.map((s) => [s.day_of_week, s])
  );

  return DAYS_OF_WEEK.map((_, index) => {
    const existing = scheduleMap.get(index as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    return {
      dayOfWeek: index,
      startTime: existing?.start_time || '09:00',
      endTime: existing?.end_time || '17:00',
      isAvailable: existing?.is_available ?? (index >= 1 && index <= 5),
    };
  });
}

export function AvailabilitySchedule({
  technicianId,
  schedule,
  onSave,
}: AvailabilityScheduleProps) {
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setWeeklySchedule(initializeSchedule(schedule));
  }, [schedule]);

  const handleDayChange = (
    dayIndex: number,
    field: 'startTime' | 'endTime' | 'isAvailable',
    value: string | boolean
  ) => {
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const scheduleData = weeklySchedule.map((day) => ({
        technician_id: technicianId,
        day_of_week: day.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        start_time: day.startTime,
        end_time: day.endTime,
        is_available: day.isAvailable,
      }));

      await onSave(scheduleData);
    } catch (error) {
      console.error('Failed to save schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {weeklySchedule.map((day) => (
          <TimeSlotPicker
            key={day.dayOfWeek}
            day={DAYS_OF_WEEK[day.dayOfWeek]}
            startTime={day.startTime}
            endTime={day.endTime}
            isAvailable={day.isAvailable}
            onStartTimeChange={(time) =>
              handleDayChange(day.dayOfWeek, 'startTime', time)
            }
            onEndTimeChange={(time) =>
              handleDayChange(day.dayOfWeek, 'endTime', time)
            }
            onToggleAvailable={() =>
              handleDayChange(day.dayOfWeek, 'isAvailable', !day.isAvailable)
            }
          />
        ))}

        <div className="pt-4">
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
