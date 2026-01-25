'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeOff } from '@/lib/types/availability';

interface TimeOffListProps {
  timeOffs: TimeOff[];
  onEdit: (timeOff: TimeOff) => void;
  onDelete: (id: string) => Promise<void>;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TimeOffList({ timeOffs, onEdit, onDelete }: TimeOffListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Scheduled Time Off</CardTitle>
      </CardHeader>
      <CardContent>
        {timeOffs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No scheduled time off
          </p>
        ) : (
          <div className="space-y-3">
            {timeOffs.map((timeOff) => (
              <div
                key={timeOff.id}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base">
                    {formatDate(timeOff.start_date)} - {formatDate(timeOff.end_date)}
                  </div>
                  {timeOff.reason && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {timeOff.reason}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(timeOff)}
                    className="h-8 px-2 sm:px-3"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(timeOff.id)}
                    className="h-8 px-2 sm:px-3 text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
