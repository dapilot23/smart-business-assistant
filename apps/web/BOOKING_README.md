# Public Customer Self-Booking

This feature allows customers to book appointments with businesses through a public-facing booking page.

## Features

- **Multi-step wizard flow**: Service selection → Date & Time → Customer Info → Confirmation
- **Mobile-first design**: Optimized for phone bookings with responsive layouts
- **Real-time availability**: Shows only available time slots based on existing appointments
- **No authentication required**: Public access for customers
- **Business branding**: Each business has their own booking URL with slug

## URLs

### Public Booking Page
```
/book/[tenantSlug]
```

Example: `https://yourdomain.com/book/acme-plumbing`

## Components

### Service Selector (`components/booking/service-selector.tsx`)
- Grid layout of available services
- Shows service name, description, duration, and price
- Visual selection state

### Date Picker (`components/booking/date-picker.tsx`)
- Calendar interface for date selection
- Disables past dates and dates beyond booking window (default 30 days)
- Mobile-friendly touch targets

### Time Slot Selector (`components/booking/time-slot-selector.tsx`)
- Shows available time slots for selected date
- Displays only available slots (not already booked)
- Grid layout for easy selection

### Customer Form (`components/booking/customer-form.tsx`)
- Collects: Name, Email, Phone, Optional Notes
- Client-side validation
- Accessible form fields with ARIA labels

### Booking Confirmation (`components/booking/booking-confirmation.tsx`)
- Success message with all booking details
- Customer and business contact information
- Option to book another appointment

## API Endpoints

All endpoints are under `/api/public` (no authentication required):

### Get Tenant by Slug
```
GET /api/public/tenants/slug/:slug
```

### Get Services
```
GET /api/public/tenants/:tenantId/services
```

### Get Available Time Slots
```
GET /api/public/tenants/:tenantId/services/:serviceId/slots?date=2026-01-23
```

### Create Booking
```
POST /api/public/tenants/:tenantId/bookings
Body: {
  serviceId: string,
  scheduledAt: string (ISO date),
  customer: {
    name: string,
    email: string,
    phone: string,
    notes?: string
  }
}
```

## Setup

### 1. Database Migration
Add slug field to tenants table:
```sql
ALTER TABLE tenants ADD COLUMN slug VARCHAR(255) UNIQUE;
```

Update existing tenants with slugs (lowercase, hyphenated version of business name).

### 2. Environment Variables
Add to `.env.local` in web app:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Middleware Configuration
The `/book/*` routes are configured as public in `middleware.ts`.

## Usage

### For Businesses
1. Set up a unique slug for your business (e.g., "acme-plumbing")
2. Add services with pricing and duration
3. Share booking URL with customers: `/book/acme-plumbing`

### For Customers
1. Visit booking URL
2. Select a service
3. Choose date and time
4. Enter contact information
5. Receive confirmation email

## Mobile Optimization

- Touch-friendly buttons (minimum 44px target size)
- Responsive grid layouts (1 column mobile, 2-3 columns desktop)
- Large, readable text
- Minimal form fields
- Progress indicator for multi-step flow

## Accessibility

- Semantic HTML structure
- ARIA labels on form fields
- Keyboard navigation support
- Error messages linked to inputs
- High contrast design
- Focus indicators

## Performance

- Server-side rendering for initial load
- Minimal JavaScript bundle
- Optimistic UI updates
- Lazy loading of time slots only when needed
- No unnecessary re-renders

## Future Enhancements

- Email/SMS confirmation to customers
- Calendar integration (Google Calendar, iCal)
- Payment collection at booking time
- Booking cancellation/rescheduling
- Business hours configuration
- Holiday/time-off handling
- Multi-language support
- Custom branding per business
