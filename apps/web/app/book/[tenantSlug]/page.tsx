'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ServiceSelector } from '@/components/booking/service-selector';
import { DatePicker } from '@/components/booking/date-picker';
import { TimeSlotSelector } from '@/components/booking/time-slot-selector';
import { CustomerForm } from '@/components/booking/customer-form';
import { BookingConfirmation } from '@/components/booking/booking-confirmation';
import { Button } from '@/components/ui/button';
import { Service, TimeSlot, CustomerInfo, Tenant } from '@/lib/types/booking';
import {
  getTenantBySlug,
  getPublicServices,
  getAvailableTimeSlots,
  createPublicBooking,
} from '@/lib/api/booking';
import { ChevronLeft, Loader2 } from 'lucide-react';

type BookingStep = 'service' | 'datetime' | 'customer' | 'confirmation';

export default function BookingPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [step, setStep] = useState<BookingStep>('service');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [tenantSlug]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadTimeSlots();
    }
  }, [selectedService, selectedDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const tenantData = await getTenantBySlug(tenantSlug);
      setTenant(tenantData);
      const servicesData = await getPublicServices(tenantData.id);
      setServices(servicesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking page');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    if (!selectedService || !selectedDate || !tenant) return;

    try {
      setLoadingSlots(true);
      const slots = await getAvailableTimeSlots(tenant.id, selectedService.id, selectedDate);
      setTimeSlots(slots);
    } catch (err) {
      console.error('Failed to load time slots:', err);
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep('datetime');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleContinueToCustomerForm = () => {
    if (selectedService && selectedDate && selectedTime) {
      setStep('customer');
    }
  };

  const handleCustomerSubmit = async (customer: CustomerInfo) => {
    if (!tenant || !selectedService || !selectedDate || !selectedTime) return;

    try {
      setSubmitting(true);
      const [hours, minutes] = selectedTime.split(':');
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await createPublicBooking(tenant.id, {
        serviceId: selectedService.id,
        scheduledAt: scheduledAt.toISOString(),
        customer,
      });

      setCustomerInfo(customer);
      setStep('confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBooking = () => {
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setCustomerInfo(null);
    setStep('service');
  };

  const handleBack = () => {
    if (step === 'datetime') {
      setStep('service');
    } else if (step === 'customer') {
      setStep('datetime');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Business Not Found</h1>
          <p className="text-muted-foreground">The booking page you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-muted-foreground">Book an appointment</p>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {step !== 'service' && step !== 'confirmation' && (
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {['service', 'datetime', 'customer', 'confirmation'].map((s, index) => {
              const stepNames = ['Service', 'Date & Time', 'Your Info', 'Confirm'];
              const isActive = step === s;
              const isPast = ['service', 'datetime', 'customer', 'confirmation'].indexOf(step) >
                ['service', 'datetime', 'customer', 'confirmation'].indexOf(s);

              return (
                <div key={s} className="flex items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isPast
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className={`ml-2 text-sm hidden sm:inline ${isActive ? 'font-medium' : ''}`}>
                    {stepNames[index]}
                  </span>
                  {index < 3 && <div className="w-8 h-px bg-border mx-2" />}
                </div>
              );
            })}
          </div>
        </div>

        {step === 'service' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Select a Service</h2>
            <ServiceSelector
              services={services}
              selectedService={selectedService || undefined}
              onSelect={handleServiceSelect}
            />
          </div>
        )}

        {step === 'datetime' && selectedService && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Choose Date</h2>
              <DatePicker selectedDate={selectedDate || undefined} onSelect={handleDateSelect} />
            </div>

            {selectedDate && (
              <div>
                <TimeSlotSelector
                  date={selectedDate}
                  slots={timeSlots}
                  selectedTime={selectedTime || undefined}
                  onSelect={handleTimeSelect}
                  loading={loadingSlots}
                />
              </div>
            )}

            {selectedTime && (
              <div className="flex justify-end">
                <Button onClick={handleContinueToCustomerForm} size="lg">
                  Continue
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'customer' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Information</h2>
            <CustomerForm
              onSubmit={handleCustomerSubmit}
              onBack={handleBack}
              loading={submitting}
            />
          </div>
        )}

        {step === 'confirmation' && selectedService && selectedDate && selectedTime && customerInfo && (
          <BookingConfirmation
            service={selectedService}
            date={selectedDate}
            time={selectedTime}
            customer={customerInfo}
            tenant={tenant}
            onNewBooking={handleNewBooking}
          />
        )}
      </main>
    </div>
  );
}
