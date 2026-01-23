# Phase 6: Quick Start Guide

## What Was Built

This phase added a complete frontend UI for the Smart Business Assistant with:

1. **Enhanced Dashboard** - Real-time analytics with charts
2. **Settings Page** - Business profile, notifications, review requests
3. **Onboarding Flow** - Multi-step wizard for new users
4. **Landing Page** - Professional marketing site with pricing

## File Locations

```
apps/web/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── dashboard/page.tsx                # Dashboard with charts
│   ├── dashboard/settings/page.tsx       # Settings page
│   └── onboarding/page.tsx               # Onboarding wizard
├── components/
│   ├── dashboard/                        # 6 dashboard components
│   ├── settings/                         # 1 settings component
│   └── onboarding/                       # 1 onboarding component
└── lib/api/
    ├── reports.ts                        # Dashboard API client
    └── settings.ts                       # Settings API client
```

## Quick Commands

### Install Dependencies
```bash
cd /home/ubuntu/smart-business-assistant/apps/web
pnpm install
```

### Run Development Server
```bash
cd /home/ubuntu/smart-business-assistant/apps/web
pnpm dev
```

Then visit:
- Landing: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- Settings: http://localhost:3000/dashboard/settings
- Onboarding: http://localhost:3000/onboarding

### Build for Production
```bash
cd /home/ubuntu/smart-business-assistant/apps/web
pnpm build
```

## Component Usage

### Dashboard StatsCard
```tsx
import { StatsCard } from "@/components/dashboard/stats-card";

<StatsCard
  icon="dollar-sign"
  label="Revenue This Month"
  value={48250}
  change={12.5}
  prefix="$"
/>
```

### Revenue Chart
```tsx
import { RevenueChart } from "@/components/dashboard/revenue-chart";

const data = [
  { date: "2026-01-01", amount: 1250 },
  { date: "2026-01-02", amount: 1500 },
];

<RevenueChart data={data} />
```

### Onboarding Wizard
```tsx
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

const steps = [
  { id: 1, label: "Info", completed: false },
  { id: 2, label: "Services", completed: false },
];

<OnboardingWizard
  currentStep={1}
  steps={steps}
  onNext={() => setStep(step + 1)}
  onBack={() => setStep(step - 1)}
  onComplete={() => router.push("/dashboard")}
>
  {/* Step content */}
</OnboardingWizard>
```

## API Integration

### Load Dashboard Data
```tsx
import { getDashboardStats } from "@/lib/api/reports";

const stats = await getDashboardStats();
// Returns: { revenue: {...}, appointments: {...}, ... }
```

### Update Settings
```tsx
import { updateSettings } from "@/lib/api/settings";

await updateSettings({
  timezone: "America/New_York",
  businessHours: [...],
});
```

## Backend TODO

Create these endpoints in NestJS:

```typescript
// Reports
GET  /api/v1/reports/dashboard-stats
GET  /api/v1/reports/revenue-chart?period=30d
GET  /api/v1/reports/appointment-stats?period=30d
GET  /api/v1/reports/top-services

// Settings
GET   /api/v1/settings
PATCH /api/v1/settings
```

See `/home/ubuntu/smart-business-assistant/apps/web/lib/api/reports.ts` and `settings.ts` for expected response types.

## Environment Variables

Already configured in `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

## Testing

### Manual Test Checklist
- [ ] Landing page loads
- [ ] Dashboard displays charts (with mock data)
- [ ] Settings tabs work
- [ ] Onboarding wizard progresses
- [ ] Forms validate input
- [ ] Responsive on mobile

### Run E2E Tests (when written)
```bash
cd /home/ubuntu/smart-business-assistant/apps/web
pnpm test:e2e
```

## Troubleshooting

### Charts not rendering?
- Check that `recharts` is installed: `pnpm list recharts`
- Verify data format matches types in `/lib/api/reports.ts`

### API calls failing?
- Backend endpoints not implemented yet (expected)
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Dashboard will show loading state until API is ready

### Settings not saving?
- Backend endpoint `/api/v1/settings` needs to be implemented
- Currently shows alert on error

## Next Steps

1. **Backend Integration**
   - Implement report endpoints
   - Implement settings endpoints
   - Add tenant isolation

2. **Testing**
   - Write E2E tests with Playwright
   - Test on mobile devices
   - Accessibility audit

3. **Polish**
   - Replace alerts with toast notifications
   - Add date range picker to charts
   - Implement data export

## Documentation

- **Detailed Component Docs:** `/home/ubuntu/smart-business-assistant/apps/web/PHASE6_COMPONENTS.md`
- **Implementation Summary:** `/home/ubuntu/smart-business-assistant/apps/web/PHASE6_IMPLEMENTATION_SUMMARY.md`
- **This Quick Start:** `/home/ubuntu/smart-business-assistant/apps/web/QUICK_START.md`

## Support

Questions? Check:
1. Component documentation (PHASE6_COMPONENTS.md)
2. Implementation summary (PHASE6_IMPLEMENTATION_SUMMARY.md)
3. Existing patterns in `/apps/web/app` and `/apps/web/components`
