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
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Dispatch</h1>
          <p className="text-sm text-slate-400">Assign jobs and optimize routes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 w-[140px] rounded-full border-white/10 bg-white/5 text-slate-100"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={reload}
            className="rounded-full border-white/10 bg-white/5 text-xs font-semibold text-slate-200 hover:border-white/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
        </div>
      </section>

      <section className="glass-panel rounded-3xl p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {error && (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
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
      </section>
    </div>
  );
}
