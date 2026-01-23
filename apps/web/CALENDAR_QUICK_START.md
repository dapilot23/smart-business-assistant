# Calendar UI - Quick Start Guide

## What Was Built

A complete appointment scheduling calendar with:
- Week view, day view, and mobile-responsive views
- Click-to-create appointments
- Full CRUD operations
- Color-coded status indicators
- Integration with backend API

## File Locations

All calendar files are in `/home/ubuntu/smart-business-assistant/apps/web/`:

```
app/(dashboard)/appointments/page.tsx     # Main page
components/calendar/*                     # Calendar components
components/appointments/*                 # Appointment modals
lib/api/appointments.ts                   # API calls
lib/types/appointment.ts                  # TypeScript types
lib/hooks/use-appointments.ts             # State management hook
lib/calendar-utils.ts                     # Helper functions
```

## Accessing the Calendar

1. **URL**: http://localhost:3000/appointments (when logged in)
2. **Navigation**: Click "Appointments" in the dashboard header

## Key Features

### Views
- **Week View** (Desktop): 7-day grid with hourly slots
- **Day View** (Desktop): Single day with expanded time slots
- **Mobile View** (Auto): List of appointments for selected day

### Actions
- **Create**: Click any empty time slot OR click "New Appointment" button
- **View**: Click any appointment card
- **Edit**: Click "Edit" in appointment details modal
- **Delete**: Click "Delete" in appointment details modal

### Time Slots
- **Default Hours**: 8 AM - 6 PM
- **Interval**: 30 minutes
- **Configurable**: Edit `lib/calendar-utils.ts` to change

## Component Usage

### Import Calendar
```tsx
import { Calendar } from '@/components/calendar';

<Calendar
  appointments={appointments}
  onSlotClick={(dateTime) => console.log('Slot clicked:', dateTime)}
  onAppointmentClick={(appointment) => console.log('Apt clicked:', appointment)}
/>
```

### Import Appointment Modal
```tsx
import { AppointmentModal } from '@/components/appointments';

<AppointmentModal
  open={true}
  onClose={() => {}}
  onSave={async (data) => await createAppointment(data)}
  customers={customers}
  services={services}
  technicians={technicians}
/>
```

### Use Appointments Hook
```tsx
import { useAppointments } from '@/lib/hooks/use-appointments';

const {
  appointments,
  customers,
  services,
  technicians,
  loading,
  error,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = useAppointments();
```

## API Integration

### Environment Variable
```bash
NEXT_PUBLIC_API_URL=http://154.12.239.51:3001/api/v1
```

### API Endpoints Used
- `GET /appointments` - List appointments
- `GET /appointments/:id` - Get appointment
- `POST /appointments` - Create appointment
- `PATCH /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Delete appointment
- `GET /customers` - List customers
- `GET /services` - List services
- `GET /technicians` - List technicians

## Appointment Data Structure

```typescript
{
  id: string;
  customer_id: string;
  service_id: string;
  technician_id?: string;
  scheduled_at: string;           // ISO 8601
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  customer?: { ... };
  service?: { ... };
  technician?: { ... };
}
```

## Status Colors

- **Scheduled**: Blue
- **Confirmed**: Green
- **In Progress**: Yellow
- **Completed**: Gray
- **Cancelled**: Red

## Responsive Behavior

- **< 768px**: Automatically switches to mobile list view
- **≥ 768px**: Shows week/day view based on user selection

## Build & Deploy

```bash
cd /home/ubuntu/smart-business-assistant/apps/web

# Build
pnpm build

# Development
pnpm dev

# Production
pnpm start
```

## Testing

1. Start dev server: `pnpm dev`
2. Navigate to: http://localhost:3000/appointments
3. Login with Clerk credentials
4. Click a time slot to create appointment
5. Click appointment to view details

## Customization

### Change Time Range
Edit `/lib/calendar-utils.ts`:
```typescript
export function generateTimeSlots(
  startHour = 8,    // Change start hour
  endHour = 18,     // Change end hour
  intervalMinutes = 30  // Change interval
)
```

### Change Status Colors
Edit `/lib/calendar-utils.ts`:
```typescript
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
    // Add your custom colors here
  };
  return colors[status] || colors.scheduled;
}
```

## File Size Compliance

All files comply with CLAUDE.md constraints:
- ✅ All files < 200 lines
- ✅ All functions < 50 lines
- ✅ 17 total files, 1417 total lines

## Troubleshooting

### Calendar not loading
- Check API URL in `.env.local`
- Verify backend is running
- Check browser console for errors

### Appointments not displaying
- Verify API returns data in correct format
- Check date filtering in API calls
- Ensure appointments have `scheduled_at` in ISO format

### Modal not opening
- Check that customers, services, technicians arrays are loaded
- Verify modal state is being set correctly
- Check console for validation errors

## Next Steps

1. Add drag-and-drop rescheduling
2. Implement recurring appointments
3. Add month view
4. Add conflict detection
5. Implement real-time updates
6. Add appointment reminders

## Support

For detailed documentation, see `/apps/web/CALENDAR_README.md`
