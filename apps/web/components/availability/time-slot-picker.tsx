'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
      {/* Day name and toggle */}
      <div className="flex items-center justify-between sm:justify-start gap-3 sm:w-32">
        <span className="font-medium text-sm sm:text-base">{day}</span>
        <div className="sm:hidden">
          <Switch
            checked={isAvailable}
            onCheckedChange={onToggleAvailable}
            aria-label={`Toggle ${day} availability`}
          />
        </div>
      </div>

      {isAvailable ? (
        <>
          {/* Time inputs */}
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1">
              <Label htmlFor={`${day}-start`} className="sr-only">
                Start time
              </Label>
              <Input
                id={`${day}-start`}
                type="time"
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <span className="text-muted-foreground text-sm px-1">to</span>
            <div className="flex-1">
              <Label htmlFor={`${day}-end`} className="sr-only">
                End time
              </Label>
              <Input
                id={`${day}-end`}
                type="time"
                value={endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
                className="w-full text-sm"
              />
            </div>
          </div>
          {/* Desktop toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAvailable}
            className="hidden sm:flex w-24 shrink-0"
          >
            Unavailable
          </Button>
        </>
      ) : (
        <>
          <div className="flex-1 text-muted-foreground text-sm">Unavailable</div>
          {/* Desktop toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAvailable}
            className="hidden sm:flex w-24 shrink-0"
          >
            Available
          </Button>
        </>
      )}
    </div>
  );
}
