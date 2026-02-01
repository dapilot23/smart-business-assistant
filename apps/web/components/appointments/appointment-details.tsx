'use client';

import { Appointment } from '@/lib/types/appointment';
import { getStatusColor } from '@/lib/calendar-utils';
import { Calendar, Clock, User, Wrench, Phone, Mail, AlertTriangle } from 'lucide-react';

function isHighRiskCustomer(noShowCount?: number): boolean {
  return (noShowCount ?? 0) >= 2;
}

interface AppointmentDetailsProps {
  appointment: Appointment;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function AppointmentDetails({
  appointment,
  onEdit,
  onDelete,
  onClose,
}: AppointmentDetailsProps) {
  const startTime = new Date(appointment.scheduled_at);
  const endTime = new Date(startTime.getTime() + appointment.duration_minutes * 60000);

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Appointment</p>
          <h2 className="font-display text-xl text-slate-100">Appointment details</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getStatusColor(appointment.status)}`}
        >
          {appointment.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {appointment.customer && isHighRiskCustomer(appointment.customer.noShowCount) && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-200" />
            <div>
              <p className="text-sm font-semibold text-amber-100">
                No-Show Risk Alert
              </p>
              <p className="mt-1 text-xs text-amber-200/80">
                This customer has {appointment.customer.noShowCount} previous no-show
                {appointment.customer.noShowCount === 1 ? '' : 's'}. Consider
                requesting a deposit or sending extra reminders.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-slate-200">
          <User className="h-4 w-4 text-emerald-200" />
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Customer</p>
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          {appointment.customer && (
            <>
              <p className="text-base font-semibold text-slate-100">
                {appointment.customer.first_name} {appointment.customer.last_name}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Phone className="h-3.5 w-3.5" />
                {appointment.customer.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Mail className="h-3.5 w-3.5" />
                {appointment.customer.email}
              </div>
              {(appointment.customer.noShowCount ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {appointment.customer.noShowCount} previous no-show
                  {appointment.customer.noShowCount === 1 ? '' : 's'}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-slate-200">
          <Calendar className="h-4 w-4 text-emerald-200" />
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Schedule</p>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-slate-100">{formatDateTime(startTime)}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(startTime)} - {formatTime(endTime)}
            <span className="text-xs text-slate-500">({appointment.duration_minutes} min)</span>
          </div>
        </div>
      </div>

      {appointment.service && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-slate-200">
            <Wrench className="h-4 w-4 text-emerald-200" />
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Service</p>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-100">
            {appointment.service.name}
          </p>
        </div>
      )}

      {appointment.notes && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Notes</p>
          <p className="mt-3 text-sm text-slate-300">{appointment.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-4">
        <button
          onClick={onEdit}
          className="flex-1 rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 rounded-full border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-100 hover:border-rose-300/60"
        >
          Delete
        </button>
        <button
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-white/20"
        >
          Close
        </button>
      </div>
    </div>
  );
}
