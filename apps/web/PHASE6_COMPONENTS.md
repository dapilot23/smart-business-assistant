# Phase 6: Polish & Launch - Frontend Components

This document lists all the frontend components and pages created for Phase 6.

## Directory Structure

```
apps/web/
├── app/
│   ├── page.tsx                          # Landing page (marketing)
│   ├── dashboard/
│   │   ├── page.tsx                      # Enhanced dashboard with analytics
│   │   └── settings/
│   │       └── page.tsx                  # Settings page with tabs
│   └── onboarding/
│       └── page.tsx                      # Multi-step onboarding wizard
├── components/
│   ├── dashboard/
│   │   ├── stats-card.tsx                # Metric card with icon and change %
│   │   ├── revenue-chart.tsx             # Line chart for revenue trend
│   │   ├── appointments-chart.tsx        # Bar chart for appointment status
│   │   ├── top-services-chart.tsx        # Horizontal bar chart for services
│   │   ├── stats-skeleton.tsx            # Loading skeleton for stats
│   │   └── chart-skeleton.tsx            # Loading skeleton for charts
│   ├── settings/
│   │   └── business-hours-input.tsx      # Day/time range input
│   └── onboarding/
│       └── onboarding-wizard.tsx         # Multi-step wizard container
└── lib/
    └── api/
        ├── reports.ts                    # Dashboard analytics API client
        └── settings.ts                   # Settings API client
```

## Pages

### 1. Landing Page (`/app/page.tsx`)

**Marketing landing page for unauthenticated users**

Features:
- Hero section with headline and CTA buttons
- Feature showcase (6 key features)
- Pricing section (3 tiers: Starter, Professional, Business)
- Call-to-action section
- Footer with links

Components:
- `FeatureCard` - Feature display with icon
- `PricingCard` - Pricing tier card

Routes:
- Redirects authenticated users to `/dashboard`
- Links to `/login` and `/signup`

---

### 2. Enhanced Dashboard (`/app/dashboard/page.tsx`)

**Main dashboard with real-time analytics and metrics**

Features:
- 6 stat cards with month-over-month change percentages
- Revenue trend line chart (last 30 days)
- Appointment status bar chart
- Top services horizontal bar chart
- Recent activity feed
- Upcoming schedule widget

Data loaded from:
- `getDashboardStats()` - Overall metrics
- `getRevenueChart('30d')` - Revenue data points
- `getAppointmentStats('30d')` - Appointment breakdown
- `getTopServices()` - Service rankings

Loading states:
- Spinner while fetching data
- Graceful error handling

---

### 3. Settings Page (`/app/dashboard/settings/page.tsx`)

**Comprehensive settings management with tabbed interface**

Tabs:
1. **Business Profile**
   - Business name (read-only)
   - Timezone selector
   - Business hours (7 days with toggle and time inputs)
   - "Standard 9-5" quick preset button

2. **Notifications**
   - Toggle: Send appointment reminders
   - Input: Reminder hours before (1-48)
   - Toggle: Auto-confirm online bookings

3. **Review Requests**
   - Toggle: Enable review requests
   - Input: Hours after completion (1-72)
   - Input: Google review URL
   - Input: Yelp review URL

Features:
- Saves to `/api/v1/settings` endpoint
- Loading spinner during save
- Success/error notifications

---

### 4. Onboarding Flow (`/app/onboarding/page.tsx`)

**Multi-step wizard for new tenant setup**

Steps:
1. **Business Info**
   - Business name, email, phone, timezone
   - Form validation (all fields required)

2. **Services**
   - Add/remove services dynamically
   - Name, duration (minutes), price
   - Minimum 1 service required

3. **Availability**
   - Business hours for each day
   - Enable/disable days
   - "Standard 9-5" quick preset

4. **Complete**
   - Success message
   - Next steps checklist
   - "Go to Dashboard" button

Features:
- Progress indicator at top
- Back/Next navigation
- Form validation per step
- Saves settings and services on completion

---

## Components

### Dashboard Components

#### `StatsCard`
```tsx
<StatsCard
  icon="dollar-sign"
  label="Revenue This Month"
  value={48250}
  change={12.5}
  prefix="$"
/>
```

Props:
- `icon` - Icon name from Icon component
- `label` - Metric label
- `value` - Number or string value
- `change?` - Percentage change (positive/negative)
- `prefix?` - Prefix like "$"
- `suffix?` - Suffix like "%"

Features:
- Color-coded change indicators (green/red)
- Trend icon (up/down)

---

#### `RevenueChart`
```tsx
<RevenueChart data={revenueData} />
```

Props:
- `data` - Array of `{ date: string, amount: number }`

Features:
- Recharts line chart
- Responsive container
- Formatted dates on X-axis
- Currency formatted Y-axis
- Tooltip with currency formatting

---

#### `AppointmentsChart`
```tsx
<AppointmentsChart data={appointmentStats} />
```

Props:
- `data` - Array of `{ status: string, count: number }`

Features:
- Recharts bar chart
- Color-coded by status
- Rounded bar corners

---

#### `TopServicesChart`
```tsx
<TopServicesChart data={topServices} />
```

Props:
- `data` - Array of `{ name: string, count: number, revenue: number }`

Features:
- Horizontal bar chart (top 5)
- Truncates long names
- Shows booking count

---

### Settings Components

#### `BusinessHoursInput`
```tsx
<BusinessHoursInput
  day="Monday"
  enabled={true}
  startTime="09:00"
  endTime="17:00"
  onEnabledChange={(enabled) => {}}
  onStartTimeChange={(time) => {}}
  onEndTimeChange={(time) => {}}
/>
```

Props:
- `day` - Day name
- `enabled` - Whether day is enabled
- `startTime` - Start time (HH:mm)
- `endTime` - End time (HH:mm)
- Callbacks for changes

Features:
- Checkbox to enable/disable
- Time inputs (disabled when unchecked)
- Consistent styling with borders

---

### Onboarding Components

#### `OnboardingWizard`
```tsx
<OnboardingWizard
  currentStep={1}
  steps={steps}
  onBack={() => {}}
  onNext={() => {}}
  onComplete={() => {}}
  nextDisabled={false}
>
  {/* Step content */}
</OnboardingWizard>
```

Props:
- `currentStep` - Current step number (1-indexed)
- `steps` - Array of `{ id, label, completed }`
- `onBack` - Back button handler
- `onNext` - Next button handler
- `onComplete` - Complete button handler (last step)
- `nextDisabled` - Disable next button
- `children` - Step content

Features:
- Visual progress indicator with circles
- Checkmarks for completed steps
- Connected line between steps
- Auto-hides back button on first step
- Shows "Complete" button on last step

---

## API Client Functions

### Reports (`lib/api/reports.ts`)

```typescript
// Get dashboard overview stats
getDashboardStats(): Promise<DashboardStats>

// Get revenue data points for chart
getRevenueChart(period: string): Promise<RevenueDataPoint[]>

// Get appointment breakdown by status
getAppointmentStats(period: string): Promise<AppointmentStats[]>

// Get top performing services
getTopServices(): Promise<TopService[]>
```

Types:
- `DashboardStats` - Revenue, appointments, customers, calls, quotes, jobs
- `RevenueDataPoint` - { date, amount }
- `AppointmentStats` - { status, count }
- `TopService` - { name, count, revenue }

---

### Settings (`lib/api/settings.ts`)

```typescript
// Get current settings
getSettings(): Promise<Settings>

// Update settings (partial update)
updateSettings(data: Partial<Settings>): Promise<Settings>
```

Types:
- `Settings` - Business profile, hours, notifications, reviews
- `BusinessHours` - { day, enabled, startTime, endTime }

---

## Usage Examples

### Loading Dashboard Data

```tsx
"use client";

import { useState, useEffect } from "react";
import { getDashboardStats } from "@/lib/api/reports";
import { StatsCard } from "@/components/dashboard/stats-card";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <StatsCard
        icon="dollar-sign"
        label="Revenue"
        value={stats.revenue.current}
        change={stats.revenue.change}
        prefix="$"
      />
    </div>
  );
}
```

---

### Updating Settings

```tsx
import { updateSettings } from "@/lib/api/settings";

async function saveBusinessHours(hours) {
  try {
    await updateSettings({ businessHours: hours });
    alert("Saved!");
  } catch (error) {
    alert("Error saving settings");
  }
}
```

---

## Accessibility

All components include:
- Proper semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Focus states
- Color contrast compliance

Form inputs:
- Associated labels with `htmlFor`
- Disabled states styled appropriately
- Required field indicators

Charts:
- Tooltip content is accessible
- Color is not the only differentiator
- Proper contrast ratios

---

## Performance Optimizations

1. **Lazy Loading**
   - Charts only render when data is available
   - Conditional rendering reduces initial load

2. **Code Splitting**
   - Recharts loaded only on dashboard
   - Settings page separate route

3. **Memoization**
   - Chart data transformations could be memoized
   - Consider `useMemo` for expensive operations

4. **Loading States**
   - Skeleton loaders for better perceived performance
   - Immediate feedback on user actions

---

## Styling Approach

- **CSS Variables** - Uses design system tokens (`var(--primary)`, etc.)
- **Tailwind CSS** - Utility-first for rapid development
- **Responsive Design** - Mobile-first with breakpoints
- **Consistent Spacing** - Design system spacing scale
- **Dark Mode Ready** - CSS variables support theme switching

---

## Testing Checklist

- [ ] Landing page renders all sections
- [ ] Dashboard loads data and displays charts
- [ ] Stats cards show correct values and changes
- [ ] Settings tabs switch correctly
- [ ] Business hours can be toggled and updated
- [ ] Settings save successfully
- [ ] Onboarding wizard progresses through steps
- [ ] Step validation works correctly
- [ ] Onboarding completes and redirects
- [ ] All forms validate input
- [ ] Loading states display properly
- [ ] Error states handled gracefully
- [ ] Responsive on mobile/tablet/desktop
- [ ] Keyboard navigation works
- [ ] Screen reader accessible

---

## Next Steps

1. **Backend Integration**
   - Implement `/api/v1/reports/*` endpoints
   - Implement `/api/v1/settings` endpoint
   - Add tenant isolation to all queries

2. **Enhanced Features**
   - Export dashboard data to CSV
   - Custom date range picker for charts
   - Notification preferences per channel (SMS/Email)
   - Service categories and grouping
   - Multi-timezone support for team members

3. **Testing**
   - E2E tests with Playwright
   - Unit tests for chart data transformations
   - Integration tests for API clients

4. **Performance**
   - Implement caching for dashboard data
   - Add polling for real-time updates
   - Optimize chart rendering for large datasets

5. **Analytics**
   - Track user interactions
   - Monitor page load times
   - A/B test landing page variations
