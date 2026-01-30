"use client";

import { assignAppointment } from '@/lib/api/appointments';
import { optimizeRoute } from '@/lib/api/ai-scheduling';
import { normalizeAppointment } from '@/lib/dispatch/dispatch-helpers';
import type { DispatchState } from './dispatch-state';

export function useDispatchAssignments(
  setAppointments: DispatchState['setAppointments'],
  setAssigning: DispatchState['setAssigning'],
  setError: DispatchState['setError'],
) {
  const assignTechnician = async (appointmentId: string, technicianId: string) => {
    setAssigning((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      const updated = await assignAppointment(appointmentId, technicianId);
      const normalized = normalizeAppointment(updated);
      setAppointments((prev) =>
        prev.map((appointment) => (appointment.id === appointmentId ? normalized : appointment)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign technician');
    } finally {
      setAssigning((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  return assignTechnician;
}

export function useDispatchRouting(
  setRoutes: DispatchState['setRoutes'],
  setRouteLoadingId: DispatchState['setRouteLoadingId'],
  setError: DispatchState['setError'],
) {
  const optimizeTechnicianRoute = async (technicianId: string, currentDate: string) => {
    setRouteLoadingId(technicianId);
    try {
      const optimized = await optimizeRoute(technicianId, currentDate);
      setRoutes((prev) => ({
        ...prev,
        [technicianId]: { ...optimized, generatedAt: new Date().toISOString() },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize route');
    } finally {
      setRouteLoadingId(null);
    }
  };

  return optimizeTechnicianRoute;
}
