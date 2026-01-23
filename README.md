# Smart Business Assistant

A multi-tenant SaaS platform for service businesses (plumbing, electrical, HVAC, auto shops, etc.) that provides AI-powered call handling, appointment scheduling, quoting, invoicing, and team messaging.

## Features

- **Multi-Tenant Architecture** - Isolated data per business with PostgreSQL Row-Level Security
- **Appointment Scheduling** - Calendar management with custom availability rules per service
- **Customer Self-Booking** - Public booking portal with email/SMS confirmations
- **Quote Generation** - Create and send professional quotes with PDF export
- **Invoicing & Payments** - Stripe integration for payment processing
- **Voice AI** - Vapi.ai integration for 24/7 AI phone call handling with appointment booking
- **SMS Notifications** - Twilio integration for appointment reminders
- **Email Confirmations** - Resend integration for transactional emails
- **Google Calendar Sync** - Background queue for reliable calendar integration

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS + TypeScript |
| Frontend | Next.js 14 (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Auth | Clerk |
| Payments | Stripe |
| SMS | Twilio |
| Email | Resend |
| Voice AI | Vapi.ai |
| Calendar | Google Calendar API |

## Project Structure

```
smart-business-assistant/
├── apps/
│   ├── api/                # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/    # Feature modules
│   │   │   │   ├── appointments/
│   │   │   │   ├── calendar/
│   │   │   │   ├── customers/
│   │   │   │   ├── invoices/
│   │   │   │   ├── payments/
│   │   │   │   ├── public-booking/
│   │   │   │   ├── quotes/
│   │   │   │   ├── services/
│   │   │   │   ├── sms/
│   │   │   │   └── voice/
│   │   │   └── config/     # Prisma, Clerk, Queue config
│   │   └── prisma/         # Database schema
│   │
│   └── web/                # Next.js frontend
│       ├── app/            # App Router pages
│       ├── components/     # React components
│       └── lib/            # Utilities and API clients
│
└── packages/
    └── shared/             # Shared types and utilities
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/dapilot23/smart-business-assistant.git
cd smart-business-assistant

# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Push database schema
cd apps/api
npx prisma db push

# Start development servers
pnpm dev
```

### Environment Variables

#### Backend (`apps/api/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/smart_business_assistant
CLERK_SECRET_KEY=sk_test_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
VAPI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/calendar/callback
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Frontend (`apps/web/.env`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## API Endpoints

### Public Booking

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/public/tenants/slug/:slug` | Get tenant by slug |
| `GET /api/v1/public/tenants/:id/services` | List services |
| `GET /api/v1/public/tenants/:id/services/:serviceId/slots` | Get available slots |
| `POST /api/v1/public/tenants/:id/bookings` | Create booking |
| `GET /api/v1/public/bookings/:token` | Get booking by token |
| `POST /api/v1/public/bookings/:token/cancel` | Cancel booking |
| `POST /api/v1/public/bookings/:token/reschedule` | Reschedule booking |

### Authenticated Endpoints

| Module | Endpoints |
|--------|-----------|
| Appointments | CRUD + availability slots |
| Customers | CRUD |
| Services | CRUD + availability rules |
| Quotes | CRUD + PDF + send |
| Invoices | CRUD + PDF + payments |
| Calendar | Connect, sync, disconnect |
| Voice | Create assistant, outbound calls |
| SMS | Send, bulk send |

## Background Queue

Calendar sync operations run via BullMQ for reliability at scale:

- **Concurrency**: 5 parallel jobs
- **Rate Limiting**: 30 jobs/minute per tenant
- **Retry**: 3 attempts with exponential backoff
- **Non-blocking**: Booking creation returns immediately

```
POST /api/v1/calendar/queue/stats    # Get queue statistics
POST /api/v1/calendar/queue/retry-failed  # Retry failed jobs
```

## AI Voice Booking

The AI phone agent can book appointments for customers during phone calls using Vapi.ai function calling.

### How It Works

1. **Customer calls** → Vapi AI answers with a personalized greeting
2. **AI asks** what service they need → calls `getServices()` to list options
3. **Customer picks a service** → AI asks when they'd like to come
4. **AI checks availability** → calls `getAvailableSlots(serviceName, date)`
5. **Customer picks a time** → AI asks for their name
6. **AI books the appointment** → calls `bookAppointment()` which:
   - Creates/finds the customer by phone number (auto-captured from caller ID)
   - Creates the appointment with confirmation code
   - Returns booking confirmation to the caller

### Example Conversation

```
AI:       "Hello! Thank you for calling Test Plumbing Co. How can I help you?"
Customer: "I need to book a drain cleaning"
AI:       "We offer Drain Cleaning for 60 minutes at $150. What day works for you?"
Customer: "How about Monday?"
AI:       "Available times for Monday: 9am, 10am, 11am, 12pm... Which time works?"
Customer: "10am please"
AI:       "And may I have your name?"
Customer: "John Smith"
AI:       "I've booked your Drain Cleaning appointment for Monday at 10am.
          Your confirmation code is ABC123. Is there anything else?"
```

### Available AI Functions

| Function | Description |
|----------|-------------|
| `getServices` | List available services with pricing and duration |
| `getAvailableSlots` | Check available time slots for a service and date |
| `bookAppointment` | Create an appointment (requires name, service, date, time) |
| `getBusinessInfo` | Get business name and contact information |
| `transferToHuman` | Transfer the call to a human representative |

### Vapi Configuration

When setting up a Vapi phone number for a tenant, configure the webhook and metadata:

```json
{
  "serverUrl": "https://your-api.com/api/v1/voice/webhook",
  "metadata": {
    "tenantId": "your-tenant-id"
  }
}
```

The `tenantId` in metadata tells the AI which business it's answering for, so it can:
- Greet callers with the correct business name
- Show the correct services and pricing
- Book appointments for the correct tenant

### Webhook Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/voice/webhook` | Main Vapi webhook (handles all events) |
| `POST /api/v1/voice/webhook/function-call` | Function call handler |
| `POST /api/v1/voice/webhook/status` | Call status updates |
| `POST /api/v1/voice/webhook/incoming` | Incoming call notifications |

## Development

```bash
# Run backend
cd apps/api && pnpm start:dev

# Run frontend
cd apps/web && pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## License

MIT
