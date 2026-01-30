"use client";

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  DispatchAppointment,
  DispatchTechnician,
  OptimizedRouteResult,
  TechnicianScore,
} from '@/lib/types/dispatch';

export type RoutePreview = OptimizedRouteResult & { generatedAt: string };

export interface DispatchState {
  appointments: DispatchAppointment[];
  setAppointments: Dispatch<SetStateAction<DispatchAppointment[]>>;
  technicians: DispatchTechnician[];
  setTechnicians: Dispatch<SetStateAction<DispatchTechnician[]>>;
  selectedTechnicianId: string | null;
  setSelectedTechnicianId: Dispatch<SetStateAction<string | null>>;
  routes: Record<string, RoutePreview>;
  setRoutes: Dispatch<SetStateAction<Record<string, RoutePreview>>>;
  suggestions: Record<string, TechnicianScore[]>;
  setSuggestions: Dispatch<SetStateAction<Record<string, TechnicianScore[]>>>;
  assigning: Record<string, boolean>;
  setAssigning: Dispatch<SetStateAction<Record<string, boolean>>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  suggestionsLoading: boolean;
  setSuggestionsLoading: Dispatch<SetStateAction<boolean>>;
  routeLoadingId: string | null;
  setRouteLoadingId: Dispatch<SetStateAction<string | null>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
}

export function useDispatchState(): DispatchState {
  const [appointments, setAppointments] = useState<DispatchAppointment[]>([]);
  const [technicians, setTechnicians] = useState<DispatchTechnician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Record<string, RoutePreview>>({});
  const [suggestions, setSuggestions] = useState<Record<string, TechnicianScore[]>>({});
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [routeLoadingId, setRouteLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return {
    appointments,
    setAppointments,
    technicians,
    setTechnicians,
    selectedTechnicianId,
    setSelectedTechnicianId,
    routes,
    setRoutes,
    suggestions,
    setSuggestions,
    assigning,
    setAssigning,
    loading,
    setLoading,
    suggestionsLoading,
    setSuggestionsLoading,
    routeLoadingId,
    setRouteLoadingId,
    error,
    setError,
  };
}
