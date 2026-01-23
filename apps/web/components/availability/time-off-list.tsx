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
      <CardHeader>
        <CardTitle>Scheduled Time Off</CardTitle>
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
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {formatDate(timeOff.start_date)} - {formatDate(timeOff.end_date)}
                  </div>
                  {timeOff.reason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {timeOff.reason}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(timeOff)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(timeOff.id)}
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
