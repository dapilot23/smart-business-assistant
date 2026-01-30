"use client";

import { RouteMap } from './route-map';
import { TechnicianAssignments } from './technician-assignments';
import { UnassignedPanel } from './unassigned-panel';
import {
  DispatchAppointment,
  DispatchTechnician,
  OptimizedRouteResult,
  TechnicianScore,
} from '@/lib/types/dispatch';

type RoutePreview = OptimizedRouteResult & { generatedAt: string };

interface DispatchBoardProps {
  technicians: DispatchTechnician[];
  appointments: DispatchAppointment[];
  unassigned: DispatchAppointment[];
  suggestions: Record<string, TechnicianScore[]>;
  suggestionsLoading: boolean;
  assigning: Record<string, boolean>;
  selectedTechnicianId: string | null;
  selectedTechnician: DispatchTechnician | null;
  route?: RoutePreview;
  routeLoading: boolean;
  onSelectTechnician: (technicianId: string) => void;
  onAssign: (appointmentId: string, technicianId: string) => void;
  onOptimizeRoute: () => void;
}

export function DispatchBoard({
  technicians,
  appointments,
  unassigned,
  suggestions,
  suggestionsLoading,
  assigning,
  selectedTechnicianId,
  selectedTechnician,
  route,
  routeLoading,
  onSelectTechnician,
  onAssign,
  onOptimizeRoute,
}: DispatchBoardProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4">
        <TechnicianAssignments
          technicians={technicians}
          appointments={appointments}
          selectedTechnicianId={selectedTechnicianId}
          onSelectTechnician={onSelectTechnician}
        />
      </div>

      <div className="space-y-4">
        <RouteMap
          technician={selectedTechnician}
          route={route}
          isLoading={routeLoading}
          onOptimize={onOptimizeRoute}
        />

        <UnassignedPanel
          unassigned={unassigned}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          assigning={assigning}
          onAssign={onAssign}
        />
      </div>
    </div>
  );
}
