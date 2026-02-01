'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/calendar/calendar';
import { AppointmentModal } from '@/components/appointments/appointment-modal';
import { AppointmentDetails } from '@/components/appointments/appointment-details';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
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
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getCustomers,
  getServices,
  getTechnicians,
} from '@/lib/api/appointments';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>();
  const [selectedDateTime, setSelectedDateTime] = useState<Date | undefined>();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
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

  const handleSlotClick = (dateTime: Date) => {
    setSelectedDateTime(dateTime);
    setSelectedAppointment(undefined);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
  };

  const handleSaveAppointment = async (data: CreateAppointmentData | UpdateAppointmentData) => {
    if (isEditing && selectedAppointment) {
      const updated = await updateAppointment(selectedAppointment.id, data);
      setAppointments(
        appointments.map((apt) => (apt.id === updated.id ? updated : apt))
      );
      setShowDetails(false);
    } else {
      const newAppointment = await createAppointment(data as CreateAppointmentData);
      setAppointments([...appointments, newAppointment]);
    }
    setShowModal(false);
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    if (!confirm('Are you sure you want to delete this appointment?')) return;

    await deleteAppointment(selectedAppointment.id);
    setAppointments(
      appointments.filter((apt) => apt.id !== selectedAppointment.id)
    );
    setShowDetails(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowDetails(false);
    setShowModal(true);
  };

  const header = (
    <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Appointments</h1>
        <p className="text-sm text-slate-400">View and add bookings.</p>
      </div>
      <button
        onClick={() => handleSlotClick(new Date())}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
      >
        <Plus className="h-4 w-4" />
        New appointment
      </button>
    </section>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-sm text-slate-400">Loading appointments...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div className="glass-panel rounded-3xl p-6">
          <p className="text-sm text-rose-200">Error: {error}</p>
          <button
            onClick={loadData}
            className="mt-4 rounded-full border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-100 hover:border-rose-300/60"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}

      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Schedule board</p>
          <h2 className="font-display text-lg text-slate-100">Weekly command view</h2>
          <p className="text-xs text-slate-400">Tap a slot to add or review appointments.</p>
        </div>
        <div className="mt-4">
          <Calendar
            appointments={appointments}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
          />
        </div>
      </section>

      <AppointmentModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedAppointment(undefined);
          setSelectedDateTime(undefined);
          setIsEditing(false);
        }}
        onSave={handleSaveAppointment}
        appointment={isEditing ? selectedAppointment : undefined}
        initialDateTime={selectedDateTime}
        customers={customers}
        services={services}
        technicians={technicians}
      />

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl rounded-2xl border border-white/10 bg-slate-950/90 text-slate-100 shadow-none backdrop-blur-xl">
          {selectedAppointment && (
            <AppointmentDetails
              appointment={selectedAppointment}
              onEdit={handleEdit}
              onDelete={handleDeleteAppointment}
              onClose={() => setShowDetails(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
