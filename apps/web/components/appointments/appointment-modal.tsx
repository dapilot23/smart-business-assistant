'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Appointment,
  CreateAppointmentData,
  UpdateAppointmentData,
  Customer,
  Service,
  Technician,
} from '@/lib/types/appointment';
import { AppointmentFormFields } from './appointment-form-fields';

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateAppointmentData | UpdateAppointmentData) => Promise<void>;
  appointment?: Appointment;
  initialDateTime?: Date;
  customers: Customer[];
  services: Service[];
  technicians: Technician[];
}

interface FormData {
  customer_id: string;
  service_id: string;
  technician_id: string;
  date: string;
  time: string;
  notes: string;
}

function initializeFormData(appointment?: Appointment, initialDateTime?: Date): FormData {
  if (appointment) {
    const scheduledAt = new Date(appointment.scheduled_at);
    return {
      customer_id: appointment.customer_id,
      service_id: appointment.service_id,
      technician_id: appointment.technician_id || '',
      date: scheduledAt.toISOString().split('T')[0],
      time: scheduledAt.toTimeString().slice(0, 5),
      notes: appointment.notes || '',
    };
  } else if (initialDateTime) {
    return {
      customer_id: '',
      service_id: '',
      technician_id: '',
      date: initialDateTime.toISOString().split('T')[0],
      time: initialDateTime.toTimeString().slice(0, 5),
      notes: '',
    };
  }
  return {
    customer_id: '',
    service_id: '',
    technician_id: '',
    date: '',
    time: '',
    notes: '',
  };
}

export function AppointmentModal({
  open,
  onClose,
  onSave,
  appointment,
  initialDateTime,
  customers,
  services,
  technicians,
}: AppointmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(() =>
    initializeFormData(appointment, initialDateTime)
  );

  useEffect(() => {
    setFormData(initializeFormData(appointment, initialDateTime));
  }, [appointment, initialDateTime]);

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduled_at = new Date(`${formData.date}T${formData.time}`).toISOString();

      const data: CreateAppointmentData | UpdateAppointmentData = {
        customer_id: formData.customer_id,
        service_id: formData.service_id,
        technician_id: formData.technician_id || undefined,
        scheduled_at,
        notes: formData.notes || undefined,
      };

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/90 text-slate-100 shadow-none backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-slate-100">
            {appointment ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AppointmentFormFields
            formData={formData}
            onChange={handleFieldChange}
            customers={customers}
            services={services}
            technicians={technicians}
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-full bg-emerald-400 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-200 hover:border-white/20"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
