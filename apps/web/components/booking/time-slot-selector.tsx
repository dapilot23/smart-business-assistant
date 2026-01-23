'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeSlot } from '@/lib/types/booking';
import { Clock } from 'lucide-react';

interface TimeSlotSelectorProps {
  date: Date;
  slots: TimeSlot[];
  selectedTime?: string;
  onSelect: (time: string) => void;
  loading?: boolean;
}

export function TimeSlotSelector({
  date,
  slots,
  selectedTime,
  onSelect,
  loading = false
}: TimeSlotSelectorProps) {
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Available Times
          </CardTitle>
          <CardDescription>{formattedDate}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading available times...
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableSlots = slots.filter((slot) => slot.available);

  if (availableSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Available Times
          </CardTitle>
          <CardDescription>{formattedDate}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No available time slots for this date. Please select another date.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Available Times
        </CardTitle>
        <CardDescription>{formattedDate}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {availableSlots.map((slot) => {
            const isSelected = selectedTime === slot.time;

            return (
              <Button
                key={slot.time}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelect(slot.time)}
                className="font-mono"
              >
                {slot.time}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
