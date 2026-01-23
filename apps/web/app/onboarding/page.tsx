"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BusinessHoursInput } from "@/components/settings/business-hours-input";
import { Icon } from "@/app/components/Icon";
import { updateSettings } from "@/lib/api/settings";

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Service {
  name: string;
  duration: number;
  price: number;
}

interface BusinessHour {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");

  // Step 2: Services
  const [services, setServices] = useState<Service[]>([
    { name: "", duration: 60, price: 0 },
  ]);

  // Step 3: Availability
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(
    DAYS.map((day) => ({
      day,
      enabled: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day),
      startTime: '09:00',
      endTime: '17:00',
    }))
  );

  const steps = [
    { id: 1, label: 'Business Info', completed: currentStep > 1 },
    { id: 2, label: 'Services', completed: currentStep > 2 },
    { id: 3, label: 'Availability', completed: currentStep > 3 },
    { id: 4, label: 'Complete', completed: currentStep > 4 },
  ];

  function handleNext() {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function handleComplete() {
    try {
      setSaving(true);

      // Save settings
      await updateSettings({
        timezone,
        businessHours,
        notifications: {
          sendReminders: true,
          reminderHoursBefore: 24,
          autoConfirmBookings: false,
        },
        reviews: {
          enabled: false,
          hoursAfterCompletion: 24,
        },
      });

      // TODO: Save services via API
      // await createServices(services);

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert('Failed to save settings. Please try again.');
      setSaving(false);
    }
  }

  function addService() {
    setServices([...services, { name: "", duration: 60, price: 0 }]);
  }

  function updateService(index: number, updates: Partial<Service>) {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], ...updates };
    setServices(newServices);
  }

  function removeService(index: number) {
    setServices(services.filter((_, i) => i !== index));
  }

  function setStandardHours() {
    setBusinessHours(
      DAYS.map((day) => ({
        day,
        enabled: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day),
        startTime: '09:00',
        endTime: '17:00',
      }))
    );
  }

  function updateBusinessHour(index: number, updates: Partial<BusinessHour>) {
    const newHours = [...businessHours];
    newHours[index] = { ...newHours[index], ...updates };
    setBusinessHours(newHours);
  }

  const isStep1Valid = businessName && email && phone && timezone;
  const isStep2Valid = services.length > 0 && services.every(s => s.name && s.duration && s.price);
  const nextDisabled =
    (currentStep === 1 && !isStep1Valid) ||
    (currentStep === 2 && !isStep2Valid) ||
    saving;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <OnboardingWizard
        currentStep={currentStep}
        steps={steps}
        onBack={handleBack}
        onNext={handleNext}
        onComplete={handleComplete}
        nextDisabled={nextDisabled}
      >
        {/* Step 1: Business Info */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h2 className="font-primary text-2xl font-semibold mb-2">
                Let&apos;s get started with your business
              </h2>
              <p className="text-[var(--muted-foreground)]">
                Tell us about your business to personalize your experience
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name *</Label>
                <Input
                  id="business-name"
                  placeholder="e.g., ABC Plumbing Services"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@yourbusiness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Business Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone *</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Services */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h2 className="font-primary text-2xl font-semibold mb-2">
                Add your services
              </h2>
              <p className="text-[var(--muted-foreground)]">
                Add at least one service that you offer to customers
              </p>
            </div>

            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={index} className="p-4 border border-[var(--border)] rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`service-name-${index}`}>Service Name *</Label>
                        <Input
                          id={`service-name-${index}`}
                          placeholder="e.g., Basic Service Call"
                          value={service.name}
                          onChange={(e) => updateService(index, { name: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`service-duration-${index}`}>Duration (minutes) *</Label>
                          <Input
                            id={`service-duration-${index}`}
                            type="number"
                            min="15"
                            step="15"
                            value={service.duration}
                            onChange={(e) =>
                              updateService(index, { duration: parseInt(e.target.value) || 60 })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`service-price-${index}`}>Price ($) *</Label>
                          <Input
                            id={`service-price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={service.price}
                            onChange={(e) =>
                              updateService(index, { price: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {services.length > 1 && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeService(index)}
                      >
                        <Icon name="trash-2" size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addService} className="w-full">
                <Icon name="plus" size={16} />
                Add Another Service
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Availability */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h2 className="font-primary text-2xl font-semibold mb-2">
                Set your availability
              </h2>
              <p className="text-[var(--muted-foreground)]">
                Configure your business hours for each day of the week
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={setStandardHours}>
                  Standard 9-5
                </Button>
              </div>

              <div className="border border-[var(--border)] rounded-lg p-4">
                {businessHours.map((hours, index) => (
                  <BusinessHoursInput
                    key={hours.day}
                    day={hours.day}
                    enabled={hours.enabled}
                    startTime={hours.startTime}
                    endTime={hours.endTime}
                    onEnabledChange={(enabled) => updateBusinessHour(index, { enabled })}
                    onStartTimeChange={(startTime) => updateBusinessHour(index, { startTime })}
                    onEndTimeChange={(endTime) => updateBusinessHour(index, { endTime })}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--primary)]/10 mb-6">
                <Icon name="check" size={40} className="text-[var(--primary)]" />
              </div>
              <h2 className="font-primary text-2xl font-semibold mb-2">
                You&apos;re all set!
              </h2>
              <p className="text-[var(--muted-foreground)]">
                Your business profile is ready. Click below to start using Smart Business Assistant.
              </p>
            </div>

            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg text-left">
              <h3 className="font-semibold mb-4">What&apos;s next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Icon name="check" size={20} className="text-[var(--primary)] mt-0.5" />
                  <span className="text-sm">
                    Set up your AI phone agent to handle customer calls
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Icon name="check" size={20} className="text-[var(--primary)] mt-0.5" />
                  <span className="text-sm">
                    Create your first appointment or quote
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Icon name="check" size={20} className="text-[var(--primary)] mt-0.5" />
                  <span className="text-sm">
                    Invite team members to collaborate
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Icon name="check" size={20} className="text-[var(--primary)] mt-0.5" />
                  <span className="text-sm">
                    Configure payment processing with Stripe
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </OnboardingWizard>
    </div>
  );
}
