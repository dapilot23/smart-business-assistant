'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  BookingDetails,
  TimeSlot,
  getBookingByToken,
  cancelBooking,
  rescheduleBooking,
  getAvailableSlotsForReschedule,
} from '@/lib/api/booking';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';

type ManageMode = 'view' | 'cancel' | 'reschedule';

function ManageBookingContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const initialAction = searchParams.get('action') as ManageMode | null;

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ManageMode>(initialAction || 'view');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Cancel form state
  const [cancelReason, setCancelReason] = useState('');

  // Reschedule form state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBookingByToken(token);
      setBooking(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadTimeSlots = useCallback(async () => {
    if (!selectedDate) return;
    try {
      setLoadingSlots(true);
      const slots = await getAvailableSlotsForReschedule(token, selectedDate);
      setTimeSlots(slots);
    } catch (err) {
      console.error('Failed to load time slots:', err);
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, token]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    if (selectedDate && mode === 'reschedule') {
      loadTimeSlots();
    }
  }, [selectedDate, mode, loadTimeSlots]);

  const handleCancel = async () => {
    try {
      setProcessing(true);
      await cancelBooking(token, cancelReason || undefined);
      setSuccess('Your appointment has been cancelled successfully.');
      setMode('view');
      loadBooking();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return;

    try {
      setProcessing(true);
      const [hours, minutes] = selectedTime.split(':');
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await rescheduleBooking(token, newDateTime.toISOString());
      setSuccess('Your appointment has been rescheduled successfully.');
      setMode('view');
      setSelectedDate(null);
      setSelectedTime(null);
      loadBooking();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule booking');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Booking Not Found</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!booking) return null;

  const isCancelled = booking.status === 'CANCELLED';
  const isCompleted = booking.status === 'COMPLETED';
  const canModify = !isCancelled && !isCompleted;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Manage Your Booking</h1>
          <p className="text-muted-foreground">View, reschedule, or cancel your appointment</p>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {success && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-green-800">{success}</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {mode !== 'view' && (
          <Button variant="ghost" onClick={() => setMode('view')} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Booking Details
          </Button>
        )}

        {mode === 'view' && (
          <div className="space-y-6">
            {/* Status Badge */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isCancelled ? (
                      <XCircle className="h-6 w-6 text-destructive" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    )}
                    <div>
                      <p className="font-medium">
                        {isCancelled
                          ? 'Cancelled'
                          : isCompleted
                          ? 'Completed'
                          : 'Confirmed'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Confirmation: {booking.confirmationCode}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.service && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{booking.service.name}</p>
                      {booking.service.description && (
                        <p className="text-sm text-muted-foreground">{booking.service.description}</p>
                      )}
                      {booking.service.price && (
                        <p className="text-sm font-medium">${booking.service.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>{formatDate(booking.scheduledAt)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span>{formatTime(booking.scheduledAt)} ({booking.duration} minutes)</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span>{booking.customer.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span>{booking.customer.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span>{booking.customer.phone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Business Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Business Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{booking.tenant.name}</p>
                <p className="text-sm text-muted-foreground">{booking.tenant.email}</p>
                {booking.tenant.phone && (
                  <p className="text-sm text-muted-foreground">{booking.tenant.phone}</p>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {canModify && (
              <div className="flex gap-3">
                <Button onClick={() => setMode('reschedule')} variant="outline" className="flex-1">
                  Reschedule
                </Button>
                <Button onClick={() => setMode('cancel')} variant="destructive" className="flex-1">
                  Cancel Appointment
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === 'cancel' && (
          <Card>
            <CardHeader>
              <CardTitle>Cancel Appointment</CardTitle>
              <CardDescription>
                Are you sure you want to cancel your appointment on {formatDate(booking.scheduledAt)} at {formatTime(booking.scheduledAt)}?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for cancellation (optional)</Label>
                <Textarea
                  id="reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Let us know why you're cancelling..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setMode('view')} className="flex-1">
                  Keep Appointment
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirm Cancellation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'reschedule' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reschedule Appointment</CardTitle>
                <CardDescription>
                  Select a new date and time for your appointment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Select New Date</Label>
                  <input
                    type="date"
                    id="date"
                    min={getMinDate()}
                    value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      setSelectedDate(e.target.value ? new Date(e.target.value) : null);
                      setSelectedTime(null);
                    }}
                    className="w-full h-10 px-3 border rounded-md"
                  />
                </div>

                {selectedDate && (
                  <div className="space-y-2">
                    <Label>Select New Time</Label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No available time slots for this date
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {timeSlots
                          .filter((slot) => slot.available)
                          .map((slot) => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedTime(slot.time)}
                            >
                              {slot.time}
                            </Button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setMode('view')} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReschedule}
                    disabled={processing || !selectedDate || !selectedTime}
                    className="flex-1"
                  >
                    {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirm Reschedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ManageBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ManageBookingContent />
    </Suspense>
  );
}
