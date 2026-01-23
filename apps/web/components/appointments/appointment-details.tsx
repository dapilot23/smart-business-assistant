'use client';

import { Appointment } from '@/lib/types/appointment';
import { getStatusColor } from '@/lib/calendar-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User, Wrench, Phone, Mail } from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Appointment Details</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
          {appointment.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {appointment.customer && (
            <>
              <p className="font-medium">
                {appointment.customer.first_name} {appointment.customer.last_name}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                {appointment.customer.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                {appointment.customer.email}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium">{formatDateTime(startTime)}</p>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            {formatTime(startTime)} - {formatTime(endTime)}
            <span className="text-xs">({appointment.duration_minutes} min)</span>
          </div>
        </CardContent>
      </Card>

      {appointment.service && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{appointment.service.name}</p>
          </CardContent>
        </Card>
      )}

      {appointment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{appointment.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 pt-4">
        <Button onClick={onEdit} className="flex-1">
          Edit
        </Button>
        <Button onClick={onDelete} variant="destructive" className="flex-1">
          Delete
        </Button>
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>
    </div>
  );
}
