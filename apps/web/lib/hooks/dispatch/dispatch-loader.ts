"use client";

import { useCallback, useEffect } from 'react';
import { getAppointments } from '@/lib/api/appointments';
import { getTeamMembers } from '@/lib/api/team';
import { getDayRange, normalizeAppointment, normalizeTechnicians } from '@/lib/dispatch/dispatch-helpers';
import type { DispatchState } from './dispatch-state';

async function fetchDispatchData(date: string) {
  const { start, end } = getDayRange(date);
  const [appointmentsData, teamData] = await Promise.all([
    getAppointments({ startDate: start.toISOString(), endDate: end.toISOString() }),
    getTeamMembers(),
  ]);
  return { appointmentsData, teamData };
}

export function useDispatchLoader(date: string, state: DispatchState) {
  const {
    setLoading,
    setError,
    setRoutes,
    setAppointments,
    setTechnicians,
    setSelectedTechnicianId,
  } = state;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRoutes({});
    try {
      const { appointmentsData, teamData } = await fetchDispatchData(date);
      const normalizedAppointments = (appointmentsData || []).map(normalizeAppointment);
      const normalizedTechnicians = normalizeTechnicians(teamData || []);

      setAppointments(normalizedAppointments);
      setTechnicians(normalizedTechnicians);
      setSelectedTechnicianId((current) => {
        if (current && normalizedTechnicians.some((tech) => tech.id === current)) {
          return current;
        }
        return normalizedTechnicians[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispatch data');
    } finally {
      setLoading(false);
    }
  }, [date, setAppointments, setError, setLoading, setRoutes, setSelectedTechnicianId, setTechnicians]);

  useEffect(() => {
    reload();
  }, [reload]);

  return reload;
}
