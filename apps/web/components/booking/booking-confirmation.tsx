'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Service, CustomerInfo, Tenant } from '@/lib/types/booking';
import { CheckCircle2, Calendar, Clock, User, Mail, Phone, MapPin } from 'lucide-react';

interface BookingConfirmationProps {
  service: Service;
  date: Date;
  time: string;
  customer: CustomerInfo;
  tenant: Tenant;
  onNewBooking?: () => void;
}

export function BookingConfirmation({
  service,
  date,
  time,
  customer,
  tenant,
  onNewBooking
}: BookingConfirmationProps) {
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
          <CardDescription>
            A confirmation email has been sent to {customer.email}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{service.name}</p>
              {service.description && (
                <p className="text-sm text-muted-foreground">{service.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span>{time} ({service.durationMinutes} minutes)</span>
          </div>

          {service.price && (
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 text-muted-foreground">$</span>
              <span className="font-medium">${service.price.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <span>{customer.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span>{customer.email}</span>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <span>{customer.phone}</span>
          </div>

          {customer.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-1">Notes:</p>
              <p className="text-sm text-muted-foreground">{customer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-medium">{tenant.name}</p>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{tenant.email}</span>
          </div>
          {tenant.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{tenant.phone}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {onNewBooking && (
        <div className="text-center">
          <Button onClick={onNewBooking} variant="outline" size="lg">
            Book Another Appointment
          </Button>
        </div>
      )}
    </div>
  );
}
