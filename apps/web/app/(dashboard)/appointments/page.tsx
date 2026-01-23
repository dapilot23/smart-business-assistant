'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/calendar/calendar';
import { AppointmentModal } from '@/components/appointments/appointment-modal';
import { AppointmentDetails } from '@/components/appointments/appointment-details';
import { Button } from '@/components/ui/button';
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

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <Button onClick={loadData}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage your appointment schedule</p>
        </div>
        <Button onClick={() => handleSlotClick(new Date())}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      <Calendar
        appointments={appointments}
        onSlotClick={handleSlotClick}
        onAppointmentClick={handleAppointmentClick}
      />

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
        <DialogContent className="max-w-2xl">
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
