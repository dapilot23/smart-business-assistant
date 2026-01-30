"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DispatchAppointment, TechnicianScore } from '@/lib/types/dispatch';
import { formatTime } from './dispatch-utils';

interface UnassignedPanelProps {
  unassigned: DispatchAppointment[];
  suggestions: Record<string, TechnicianScore[]>;
  suggestionsLoading: boolean;
  assigning: Record<string, boolean>;
  onAssign: (appointmentId: string, technicianId: string) => void;
}

export function UnassignedPanel({
  unassigned,
  suggestions,
  suggestionsLoading,
  assigning,
  onAssign,
}: UnassignedPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          Unassigned Jobs
          <Badge variant="secondary" className="text-[10px]">
            {unassigned.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          AI suggestions help match the best technician fast.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unassigned.length === 0 ? (
          <div className="text-sm text-muted-foreground">Everything is assigned.</div>
        ) : (
          unassigned.map((appointment) => (
            <UnassignedCard
              key={appointment.id}
              appointment={appointment}
              suggestions={suggestions[appointment.id] || []}
              suggestionsLoading={suggestionsLoading}
              assigning={assigning[appointment.id]}
              onAssign={onAssign}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function UnassignedCard({
  appointment,
  suggestions,
  suggestionsLoading,
  assigning,
  onAssign,
}: {
  appointment: DispatchAppointment;
  suggestions: TechnicianScore[];
  suggestionsLoading: boolean;
  assigning?: boolean;
  onAssign: (appointmentId: string, technicianId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{appointment.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(appointment.scheduledAt)} · {appointment.serviceName}
          </p>
        </div>
        <Badge className="text-[10px]">Unassigned</Badge>
      </div>

      <div className="space-y-2">
        {suggestionsLoading ? (
          <div className="text-xs text-muted-foreground">Analyzing best matches...</div>
        ) : suggestions.length === 0 ? (
          <div className="text-xs text-muted-foreground">No suggestions available.</div>
        ) : (
          suggestions.slice(0, 2).map((option) => (
            <SuggestionRow
              key={option.userId}
              suggestion={option}
              disabled={assigning}
              onAssign={() => onAssign(appointment.id, option.userId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  disabled,
  onAssign,
}: {
  suggestion: TechnicianScore;
  disabled?: boolean;
  onAssign: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-secondary/40 px-3 py-2">
      <div>
        <p className="text-xs font-medium text-foreground">{suggestion.userName}</p>
        <p className="text-[11px] text-muted-foreground">
          {suggestion.skillLevel ? `${suggestion.skillLevel.toLowerCase()} skill` : 'Skill match'}
        </p>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={disabled} onClick={onAssign}>
        Assign
      </Button>
    </div>
  );
}
