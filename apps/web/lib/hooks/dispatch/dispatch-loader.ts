"use client";

import { useEffect } from 'react';
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
  const reload = async () => {
    state.setLoading(true);
    state.setError(null);
    state.setRoutes({});
    try {
      const { appointmentsData, teamData } = await fetchDispatchData(date);
      const normalizedAppointments = (appointmentsData || []).map(normalizeAppointment);
      const normalizedTechnicians = normalizeTechnicians(teamData || []);

      state.setAppointments(normalizedAppointments);
      state.setTechnicians(normalizedTechnicians);
      state.setSelectedTechnicianId((current) => {
        if (current && normalizedTechnicians.some((tech) => tech.id === current)) {
          return current;
        }
        return normalizedTechnicians[0]?.id ?? null;
      });
    } catch (err) {
      state.setError(err instanceof Error ? err.message : 'Failed to load dispatch data');
    } finally {
      state.setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [date]);

  return reload;
}
