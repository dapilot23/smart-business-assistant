'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TimeSlotPickerProps {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onToggleAvailable: () => void;
}

export function TimeSlotPicker({
  day,
  startTime,
  endTime,
  isAvailable,
  onStartTimeChange,
  onEndTimeChange,
  onToggleAvailable,
}: TimeSlotPickerProps) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="w-24 font-medium">{day}</div>

      {isAvailable ? (
        <>
          <div className="flex-1 flex gap-2 items-center">
            <div className="flex-1">
              <Label htmlFor={`${day}-start`} className="sr-only">
                Start time
              </Label>
              <Input
                id={`${day}-start`}
                type="time"
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className="w-full"
              />
            </div>
            <span className="text-muted-foreground">to</span>
            <div className="flex-1">
              <Label htmlFor={`${day}-end`} className="sr-only">
                End time
              </Label>
              <Input
                id={`${day}-end`}
                type="time"
                value={endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAvailable}
            className="w-24"
          >
            Unavailable
          </Button>
        </>
      ) : (
        <>
          <div className="flex-1 text-muted-foreground">Unavailable</div>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAvailable}
            className="w-24"
          >
            Available
          </Button>
        </>
      )}
    </div>
  );
}
