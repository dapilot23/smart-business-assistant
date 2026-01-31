"use client";

import { useEffect } from 'react';
import { findBestTechnicians } from '@/lib/api/ai-scheduling';
import { DispatchAppointment } from '@/lib/types/dispatch';
import type { DispatchState } from './dispatch-state';

export function useDispatchSuggestions(
  date: string,
  unassigned: DispatchAppointment[],
  setSuggestions: DispatchState['setSuggestions'],
  setSuggestionsLoading: DispatchState['setSuggestionsLoading'],
) {
  useEffect(() => {
    let active = true;

    const run = async () => {
      if (unassigned.length === 0) {
        setSuggestions({});
        setSuggestionsLoading(false);
        return;
      }

      setSuggestionsLoading(true);

      try {
        const entries = await Promise.all(
          unassigned.map(async (appointment) => {
            if (!appointment.serviceId) return [appointment.id, []] as const;
            const scores = await findBestTechnicians({
              serviceId: appointment.serviceId,
              date: appointment.scheduledAt,
            });
            return [appointment.id, scores] as const;
          }),
        );

        if (active) {
          setSuggestions(Object.fromEntries(entries));
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load dispatch suggestions', err);
          setSuggestions({});
        }
      } finally {
        if (active) {
          setSuggestionsLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [unassigned, date, setSuggestions, setSuggestionsLoading]);
}
