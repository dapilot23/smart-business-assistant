import { useState, useEffect } from 'react';
import {
  Appointment,
  CreateAppointmentData,
  UpdateAppointmentData,
  Customer,
  Service,
  Technician,
} from '@/lib/types/appointment';
import {
  getAppointments,
  createAppointment as apiCreateAppointment,
  updateAppointment as apiUpdateAppointment,
  deleteAppointment as apiDeleteAppointment,
  getCustomers,
  getServices,
  getTechnicians,
} from '@/lib/api/appointments';

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [appts, custs, servs, techs] = await Promise.all([
        getAppointments(),
        getCustomers(),
        getServices(),
        getTechnicians(),
      ]);
      setAppointments(appts);
      setCustomers(custs);
      setServices(servs);
      setTechnicians(techs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (data: CreateAppointmentData) => {
    const newAppointment = await apiCreateAppointment(data);
    setAppointments([...appointments, newAppointment]);
    return newAppointment;
  };

  const updateAppointment = async (id: string, data: UpdateAppointmentData) => {
    const updated = await apiUpdateAppointment(id, data);
    setAppointments(
      appointments.map((apt) => (apt.id === updated.id ? updated : apt))
    );
    return updated;
  };

  const deleteAppointment = async (id: string) => {
    await apiDeleteAppointment(id);
    setAppointments(appointments.filter((apt) => apt.id !== id));
  };

  return {
    appointments,
    customers,
    services,
    technicians,
    loading,
    error,
    loadData,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
}
