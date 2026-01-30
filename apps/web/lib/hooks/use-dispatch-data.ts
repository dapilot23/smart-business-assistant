"use client";

import { useMemo } from 'react';
import { useDispatchState } from './dispatch/dispatch-state';
import { useDispatchLoader } from './dispatch/dispatch-loader';
import { useDispatchSuggestions } from './dispatch/dispatch-suggestions';
import { useDispatchAssignments, useDispatchRouting } from './dispatch/dispatch-actions';

export function useDispatchData(date: string) {
  const state = useDispatchState();
  const unassigned = useMemo(
    () => state.appointments.filter((appointment) => !appointment.technicianId),
    [state.appointments],
  );
  const selectedTechnician = useMemo(
    () => state.technicians.find((tech) => tech.id === state.selectedTechnicianId) ?? null,
    [state.technicians, state.selectedTechnicianId],
  );

  const reload = useDispatchLoader(date, state);
  useDispatchSuggestions(date, unassigned, state.setSuggestions, state.setSuggestionsLoading);
  const assignTechnician = useDispatchAssignments(
    state.setAppointments,
    state.setAssigning,
    state.setError,
  );
  const optimizeTechnicianRoute = useDispatchRouting(
    state.setRoutes,
    state.setRouteLoadingId,
    state.setError,
  );

  return {
    appointments: state.appointments,
    technicians: state.technicians,
    unassigned,
    suggestions: state.suggestions,
    assigning: state.assigning,
    loading: state.loading,
    suggestionsLoading: state.suggestionsLoading,
    routeLoadingId: state.routeLoadingId,
    error: state.error,
    selectedTechnicianId: state.selectedTechnicianId,
    selectedTechnician,
    routes: state.routes,
    setSelectedTechnicianId: state.setSelectedTechnicianId,
    reload,
    assignTechnician,
    optimizeTechnicianRoute,
  };
}
