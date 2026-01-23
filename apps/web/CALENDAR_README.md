# Calendar UI Documentation

## Overview

A comprehensive calendar UI system for appointment scheduling built with Next.js, React, TypeScript, and Tailwind CSS. The calendar supports week view, day view, and mobile-responsive list view with full CRUD operations for appointments.

## Features

- **Multi-view Support**: Week view, day view, and mobile-optimized list view
- **Time Slots**: Configurable hourly time slots (default: 8 AM - 6 PM, 30-min intervals)
- **Drag-free Interaction**: Click slots to create appointments, click appointments to view details
- **Color-coded Status**: Visual indicators for appointment status (scheduled, confirmed, in progress, completed, cancelled)
- **Responsive Design**: Desktop week/day views automatically switch to mobile list view on smaller screens
- **Accessibility**: Semantic HTML, keyboard navigation support, ARIA labels

## File Structure

```
apps/web/
├── app/(dashboard)/appointments/
│   └── page.tsx                          # Main appointments page
├── components/
│   ├── calendar/
│   │   ├── calendar.tsx                  # Main calendar wrapper with responsive logic
│   │   ├── calendar-header.tsx           # Navigation and view controls
│   │   ├── calendar-day-view.tsx         # Single day with time slots
│   │   ├── calendar-week-view.tsx        # Week grid with 7 columns
│   │   ├── calendar-mobile-view.tsx      # Mobile-optimized list view
│   │   ├── time-slot.tsx                 # Individual clickable time slot
│   │   ├── appointment-card.tsx          # Appointment display card
│   │   └── index.ts                      # Barrel exports
│   └── appointments/
│       ├── appointment-modal.tsx         # Create/edit appointment form
│       ├── appointment-details.tsx       # View appointment details
│       └── index.ts                      # Barrel exports
├── lib/
│   ├── api/
│   │   └── appointments.ts               # API integration functions
│   ├── hooks/
│   │   └── use-appointments.ts           # Custom hook for state management
│   ├── types/
│   │   └── appointment.ts                # TypeScript type definitions
│   └── calendar-utils.ts                 # Calendar helper functions
└── components/ui/                        # shadcn/ui components
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    ├── input.tsx
    ├── label.tsx
    ├── select.tsx
    └── textarea.tsx
```

## Components

### Calendar Components

#### `Calendar`
Main wrapper component that handles view switching and responsive behavior.

**Props:**
- `appointments: Appointment[]` - Array of appointments to display
- `onSlotClick: (dateTime: Date) => void` - Callback when empty time slot is clicked
- `onAppointmentClick: (appointment: Appointment) => void` - Callback when appointment is clicked
- `defaultView?: 'week' | 'day'` - Initial view (default: 'week')

**Features:**
- Automatically switches to mobile view on screens < 768px
- Responsive time slot rendering
- State management for current date and view

#### `CalendarHeader`
Navigation controls for the calendar.

**Props:**
- `currentDate: Date` - Current displayed date
- `view: 'week' | 'day'` - Current view mode
- `onPrevious: () => void` - Navigate to previous period
- `onNext: () => void` - Navigate to next period
- `onToday: () => void` - Jump to today
- `onViewChange: (view: 'week' | 'day') => void` - Switch view mode

#### `CalendarWeekView`
Desktop week grid with 7 columns (Monday-Sunday) and hourly time slots.

**Props:**
- `currentDate: Date` - Current week date
- `appointments: Appointment[]` - Appointments to display
- `onSlotClick: (dateTime: Date) => void` - Slot click handler
- `onAppointmentClick: (appointment: Appointment) => void` - Appointment click handler

**Features:**
- Highlights current day
- 7 columns for days of the week
- Scrollable time slot grid

#### `CalendarDayView`
Single day view with expanded time slots.

**Props:**
- `date: Date` - Day to display
- `appointments: Appointment[]` - Appointments to display
- `onSlotClick: (dateTime: Date) => void` - Slot click handler
- `onAppointmentClick: (appointment: Appointment) => void` - Appointment click handler

#### `CalendarMobileView`
Mobile-optimized list view for appointments.

**Props:**
- `date: Date` - Day to display
- `appointments: Appointment[]` - Appointments to display
- `onSlotClick: (dateTime: Date) => void` - Slot click handler
- `onAppointmentClick: (appointment: Appointment) => void` - Appointment click handler

**Features:**
- Vertical list of appointments
- Empty state with "Schedule Appointment" CTA
- Quick add button in header

#### `TimeSlot`
Individual time slot component (30-minute interval).

**Props:**
- `hour: number` - Hour (0-23)
- `minute: number` - Minute (0, 30)
- `date: Date` - Date for this slot
- `appointments: Appointment[]` - All appointments (filtered internally)
- `onSlotClick: (dateTime: Date) => void` - Empty slot click handler
- `onAppointmentClick: (appointment: Appointment) => void` - Appointment click handler

**Features:**
- Filters appointments for this specific time slot
- Visual indication for booked slots
- Hover states

#### `AppointmentCard`
Display card for an appointment.

**Props:**
- `appointment: Appointment` - Appointment data
- `onClick: (appointment: Appointment) => void` - Click handler

**Features:**
- Color-coded by status
- Shows customer name, time range, and service
- Hover effects

### Appointment Components

#### `AppointmentModal`
Modal form for creating or editing appointments.

**Props:**
- `open: boolean` - Modal visibility
- `onClose: () => void` - Close handler
- `onSave: (data: CreateAppointmentData | UpdateAppointmentData) => Promise<void>` - Save handler
- `appointment?: Appointment` - Existing appointment (for editing)
- `initialDateTime?: Date` - Pre-fill date/time (for new appointments)
- `customers: Customer[]` - Available customers
- `services: Service[]` - Available services
- `technicians: Technician[]` - Available technicians

**Form Fields:**
- Customer (required, select)
- Service (required, select)
- Technician (optional, select)
- Date (required, date picker)
- Time (required, time picker)
- Notes (optional, textarea)

#### `AppointmentDetails`
Modal view for appointment details with edit/delete actions.

**Props:**
- `appointment: Appointment` - Appointment to display
- `onEdit: () => void` - Edit button handler
- `onDelete: () => void` - Delete button handler
- `onClose: () => void` - Close button handler

**Displays:**
- Customer information (name, phone, email)
- Schedule (date, time range, duration)
- Service details
- Notes
- Status badge

## API Integration

### `/lib/api/appointments.ts`

All API functions use the `NEXT_PUBLIC_API_URL` environment variable.

#### Functions:

```typescript
// Get all appointments (with optional date filtering)
getAppointments(params?: { start_date?: string; end_date?: string }): Promise<Appointment[]>

// Get single appointment by ID
getAppointment(id: string): Promise<Appointment>

// Create new appointment
createAppointment(data: CreateAppointmentData): Promise<Appointment>

// Update existing appointment
updateAppointment(id: string, data: UpdateAppointmentData): Promise<Appointment>

// Delete appointment
deleteAppointment(id: string): Promise<void>

// Get customers list
getCustomers(): Promise<Customer[]>

// Get services list
getServices(): Promise<Service[]>

// Get technicians list
getTechnicians(): Promise<Technician[]>
```

## State Management

### `useAppointments` Hook

Custom React hook for managing appointment state and API calls.

```typescript
const {
  appointments,      // Appointment[]
  customers,         // Customer[]
  services,          // Service[]
  technicians,       // Technician[]
  loading,           // boolean
  error,             // string | null
  loadData,          // () => Promise<void>
  createAppointment, // (data: CreateAppointmentData) => Promise<Appointment>
  updateAppointment, // (id: string, data: UpdateAppointmentData) => Promise<Appointment>
  deleteAppointment, // (id: string) => Promise<void>
} = useAppointments();
```

## Utility Functions

### `/lib/calendar-utils.ts`

```typescript
// Generate time slots for a day
generateTimeSlots(startHour?: number, endHour?: number, intervalMinutes?: number): TimeSlot[]

// Format time as "12:30 PM"
formatTime(hour: number, minute: number): string

// Get array of 7 dates for the week
getWeekDays(date: Date): Date[]

// Format date as "Mon, Jan 23"
formatDate(date: Date): string

// Format date as ISO "2026-01-23"
formatDateISO(date: Date): string

// Check if two dates are the same day
isSameDay(date1: Date, date2: Date): boolean

// Get Tailwind color classes for appointment status
getStatusColor(status: string): string
```

## Type Definitions

### `/lib/types/appointment.ts`

```typescript
interface Appointment {
  id: string;
  customer_id: string;
  service_id: string;
  technician_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  customer?: Customer;
  service?: Service;
  technician?: Technician;
  created_at: string;
  updated_at: string;
}

interface CreateAppointmentData {
  customer_id: string;
  service_id: string;
  technician_id?: string;
  scheduled_at: string; // ISO 8601 format
  notes?: string;
}

interface UpdateAppointmentData {
  customer_id?: string;
  service_id?: string;
  technician_id?: string;
  scheduled_at?: string;
  status?: Appointment['status'];
  notes?: string;
}
```

## Usage Examples

### Basic Calendar Implementation

```tsx
import { Calendar } from '@/components/calendar';
import { useAppointments } from '@/lib/hooks/use-appointments';

export function AppointmentsPage() {
  const { appointments } = useAppointments();
  const [showModal, setShowModal] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date>();

  const handleSlotClick = (dateTime: Date) => {
    setSelectedDateTime(dateTime);
    setShowModal(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    // Handle appointment click
  };

  return (
    <Calendar
      appointments={appointments}
      onSlotClick={handleSlotClick}
      onAppointmentClick={handleAppointmentClick}
    />
  );
}
```

### Creating an Appointment

```tsx
import { AppointmentModal } from '@/components/appointments';
import { useAppointments } from '@/lib/hooks/use-appointments';

export function MyComponent() {
  const { customers, services, technicians, createAppointment } = useAppointments();

  const handleSave = async (data: CreateAppointmentData) => {
    await createAppointment(data);
    // Appointment automatically added to state
  };

  return (
    <AppointmentModal
      open={true}
      onClose={() => {}}
      onSave={handleSave}
      initialDateTime={new Date()}
      customers={customers}
      services={services}
      technicians={technicians}
    />
  );
}
```

## Styling

All components use Tailwind CSS for styling with the following design system:

- **Colors**: Status-based color coding using Tailwind's color palette
- **Spacing**: Consistent padding and margins using Tailwind spacing scale
- **Typography**: System font stack with responsive sizing
- **Borders**: Subtle borders for visual separation
- **Shadows**: Hover states use subtle shadows for depth

### Status Colors

```typescript
scheduled: 'bg-blue-100 text-blue-800 border-blue-200'
confirmed: 'bg-green-100 text-green-800 border-green-200'
in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200'
completed: 'bg-gray-100 text-gray-800 border-gray-200'
cancelled: 'bg-red-100 text-red-800 border-red-200'
```

## Responsive Breakpoints

- **Mobile**: < 768px (automatically uses CalendarMobileView)
- **Tablet**: 768px - 1024px (week view with horizontal scroll)
- **Desktop**: > 1024px (full week view)

## Accessibility

- Semantic HTML elements (`<button>`, `<form>`, etc.)
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators on interactive elements
- Screen reader-friendly time and date formats
- Color contrast meets WCAG AA standards

## Performance Optimizations

- **Memoization**: Components use React.memo where appropriate
- **Code Splitting**: Components loaded dynamically
- **Lazy Loading**: Calendar views loaded on-demand
- **Optimistic Updates**: UI updates immediately on user actions
- **Debounced Resize**: Window resize handler is debounced

## Configuration

### Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://154.12.239.51:3001/api/v1
```

### Calendar Configuration

To customize time slots, edit `generateTimeSlots` parameters:

```typescript
// Default: 8 AM - 6 PM, 30-minute intervals
const timeSlots = generateTimeSlots(8, 18, 30);

// Custom: 7 AM - 9 PM, 15-minute intervals
const timeSlots = generateTimeSlots(7, 21, 15);
```

## Testing

Run the build to verify:

```bash
cd /home/ubuntu/smart-business-assistant/apps/web
pnpm build
```

## Known Limitations

1. **No drag-and-drop**: Currently appointments cannot be dragged to reschedule
2. **Single timezone**: All times displayed in local browser timezone
3. **No recurring appointments**: Each appointment is standalone
4. **File size**: All components under 200 lines per CLAUDE.md constraints
5. **Function size**: All functions under 50 lines per CLAUDE.md constraints

## Future Enhancements

- Drag-and-drop rescheduling
- Multi-timezone support
- Recurring appointment patterns
- Month view
- Print-friendly view
- Export to calendar (iCal, Google Calendar)
- Real-time updates via WebSocket
- Conflict detection
- Appointment reminders
- Advanced filtering and search

## License

Part of Smart Business Assistant project.
