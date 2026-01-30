'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DispatchBoard } from '@/components/dispatch/dispatch-board';
import { useDispatchData } from '@/lib/hooks/use-dispatch-data';
import { toInputDate } from '@/lib/dispatch/dispatch-helpers';

export default function DispatchPage() {
  const [date, setDate] = useState(() => toInputDate(new Date()));
  const {
    appointments,
    technicians,
    unassigned,
    suggestions,
    assigning,
    loading,
    suggestionsLoading,
    routeLoadingId,
    error,
    selectedTechnicianId,
    selectedTechnician,
    routes,
    setSelectedTechnicianId,
    reload,
    assignTechnician,
    optimizeTechnicianRoute,
  } = useDispatchData(date);

  const handleOptimizeRoute = () => {
    if (!selectedTechnicianId) return;
    optimizeTechnicianRoute(selectedTechnicianId, date);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--foreground)]">Dispatch Board</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Match technicians, optimize routes, and fill gaps fast
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 w-[140px]"
          />
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DispatchBoard
              technicians={technicians}
              appointments={appointments}
              unassigned={unassigned}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
              assigning={assigning}
              selectedTechnicianId={selectedTechnicianId}
              selectedTechnician={selectedTechnician}
              route={selectedTechnicianId ? routes[selectedTechnicianId] : undefined}
              routeLoading={selectedTechnicianId ? routeLoadingId === selectedTechnicianId : false}
              onSelectTechnician={setSelectedTechnicianId}
              onAssign={assignTechnician}
              onOptimizeRoute={handleOptimizeRoute}
            />
          )}
        </div>
      </div>
    </div>
  );
}
