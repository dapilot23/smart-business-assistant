"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BusinessHoursInput } from "@/components/settings/business-hours-input";
import { ColorThemeSwitcher } from "@/components/settings/color-theme-switcher";
import { TypographySwitcher } from "@/components/settings/typography-switcher";
import { getSettings, updateSettings, type Settings, type BusinessHours } from "@/lib/api/settings";
import { Icon } from "@/app/components/Icon";

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'notifications' | 'reviews' | 'appearance'>('business');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Set default settings
      setSettings({
        timezone: 'America/New_York',
        businessHours: DAYS.map(day => ({
          day,
          enabled: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day),
          startTime: '09:00',
          endTime: '17:00',
        })),
        notifications: {
          sendReminders: true,
          reminderHoursBefore: 24,
          autoConfirmBookings: false,
        },
        reviews: {
          enabled: false,
          hoursAfterCompletion: 24,
          googleUrl: '',
          yelpUrl: '',
        },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;

    try {
      setSaving(true);
      await updateSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function setStandardHours() {
    if (!settings) return;
    setSettings({
      ...settings,
      businessHours: DAYS.map(day => ({
        day,
        enabled: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day),
        startTime: '09:00',
        endTime: '17:00',
      })),
    });
  }

  function updateBusinessHour(index: number, updates: Partial<BusinessHours>) {
    if (!settings) return;
    const newHours = [...settings.businessHours];
    newHours[index] = { ...newHours[index], ...updates };
    setSettings({ ...settings, businessHours: newHours });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon name="loader-2" size={32} className="text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between h-20 px-8 border-b border-[var(--border)]">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-primary text-[20px] font-semibold text-[var(--foreground)]">
            Settings
          </h1>
          <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
            Manage your business preferences and configuration
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Icon name="loader-2" size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Icon name="save" size={16} />
              Save Changes
            </>
          )}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-64 border-r border-[var(--border)] p-4">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('business')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'business'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'
              }`}
            >
              <Icon name="building-2" size={18} />
              Business Profile
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'
              }`}
            >
              <Icon name="bell" size={18} />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'
              }`}
            >
              <Icon name="message-square" size={18} />
              Review Requests
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'
              }`}
            >
              <Icon name="palette" size={18} />
              Appearance
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'business' && (
            <div className="max-w-3xl">
              <div className="mb-8">
                <h2 className="font-primary text-xl font-semibold mb-2">Business Profile</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Configure your business information and operating hours
                </p>
              </div>

              <div className="space-y-6">
                {/* Business Name */}
                {settings.businessName && (
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={settings.businessName}
                      disabled
                      className="bg-[var(--secondary)]"
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Contact support to change your business name
                    </p>
                  </div>
                )}

                {/* Timezone */}
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Business Hours */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Business Hours</Label>
                    <Button variant="outline" size="sm" onClick={setStandardHours}>
                      Standard 9-5
                    </Button>
                  </div>
                  <div className="border border-[var(--border)] rounded-lg p-4">
                    {settings.businessHours.map((hours, index) => (
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
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-3xl">
              <div className="mb-8">
                <h2 className="font-primary text-xl font-semibold mb-2">Notifications</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Configure automated notifications for appointments
                </p>
              </div>

              <div className="space-y-6">
                {/* Send Reminders */}
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Send Appointment Reminders</Label>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      Automatically send SMS reminders to customers
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.sendReminders}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, sendReminders: e.target.checked },
                      })
                    }
                    className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)]"
                  />
                </div>

                {/* Reminder Hours */}
                <div className="space-y-2">
                  <Label htmlFor="reminder-hours">Reminder Hours Before Appointment</Label>
                  <Input
                    id="reminder-hours"
                    type="number"
                    min="1"
                    max="48"
                    value={settings.notifications.reminderHoursBefore}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          reminderHoursBefore: parseInt(e.target.value) || 24,
                        },
                      })
                    }
                    disabled={!settings.notifications.sendReminders}
                  />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Between 1 and 48 hours
                  </p>
                </div>

                {/* Auto-Confirm */}
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Auto-Confirm Online Bookings</Label>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      Automatically confirm appointments from online booking
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.autoConfirmBookings}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          autoConfirmBookings: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-3xl">
              <div className="mb-8">
                <h2 className="font-primary text-xl font-semibold mb-2">Review Requests</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Automatically request reviews after job completion
                </p>
              </div>

              <div className="space-y-6">
                {/* Enable Reviews */}
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Enable Review Requests</Label>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      Send automated review requests via SMS
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.reviews.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reviews: { ...settings.reviews, enabled: e.target.checked },
                      })
                    }
                    className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)]"
                  />
                </div>

                {/* Hours After Completion */}
                <div className="space-y-2">
                  <Label htmlFor="review-hours">Hours After Job Completion</Label>
                  <Input
                    id="review-hours"
                    type="number"
                    min="1"
                    max="72"
                    value={settings.reviews.hoursAfterCompletion}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reviews: {
                          ...settings.reviews,
                          hoursAfterCompletion: parseInt(e.target.value) || 24,
                        },
                      })
                    }
                    disabled={!settings.reviews.enabled}
                  />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Between 1 and 72 hours
                  </p>
                </div>

                {/* Google URL */}
                <div className="space-y-2">
                  <Label htmlFor="google-url">Google Review URL</Label>
                  <Input
                    id="google-url"
                    type="url"
                    placeholder="https://g.page/..."
                    value={settings.reviews.googleUrl || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reviews: { ...settings.reviews, googleUrl: e.target.value },
                      })
                    }
                    disabled={!settings.reviews.enabled}
                  />
                </div>

                {/* Yelp URL */}
                <div className="space-y-2">
                  <Label htmlFor="yelp-url">Yelp Review URL</Label>
                  <Input
                    id="yelp-url"
                    type="url"
                    placeholder="https://www.yelp.com/..."
                    value={settings.reviews.yelpUrl || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reviews: { ...settings.reviews, yelpUrl: e.target.value },
                      })
                    }
                    disabled={!settings.reviews.enabled}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-4xl">
              <div className="mb-8">
                <h2 className="font-primary text-xl font-semibold mb-2">Appearance</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Customize the look and feel of your dashboard. Preferences are saved locally in your browser.
                </p>
              </div>

              <div className="space-y-10">
                {/* Color Theme Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Icon name="palette" size={20} className="text-[var(--primary)]" />
                    <Label className="text-lg font-semibold">Color Theme</Label>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Choose an accent color for buttons, links, and highlights
                  </p>
                  <div className="bg-card border border-border rounded-xl p-6">
                    <ColorThemeSwitcher />
                  </div>
                </div>

                {/* Typography Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--primary)] text-xl font-bold font-primary">Aa</span>
                    <Label className="text-lg font-semibold">Typography</Label>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Choose a font pairing for headings and body text
                  </p>
                  <div className="bg-card border border-border rounded-xl p-6">
                    <TypographySwitcher />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
