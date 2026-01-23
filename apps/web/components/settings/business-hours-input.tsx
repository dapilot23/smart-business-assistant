import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BusinessHoursInputProps {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  onEnabledChange: (enabled: boolean) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export function BusinessHoursInput({
  day,
  enabled,
  startTime,
  endTime,
  onEnabledChange,
  onStartTimeChange,
  onEndTimeChange,
}: BusinessHoursInputProps) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <div className="flex items-center gap-3 w-32">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]"
        />
        <Label className="font-medium text-sm">{day}</Label>
      </div>

      <div className="flex items-center gap-3 flex-1">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor={`${day}-start`} className="text-xs text-[var(--muted-foreground)]">
            Start Time
          </Label>
          <Input
            id={`${day}-start`}
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            disabled={!enabled}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor={`${day}-end`} className="text-xs text-[var(--muted-foreground)]">
            End Time
          </Label>
          <Input
            id={`${day}-end`}
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            disabled={!enabled}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
