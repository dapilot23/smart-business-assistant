# Smart Business Assistant

A multi-tenant SaaS platform for service businesses (plumbing, electrical, HVAC, auto shops, etc.) that provides AI-powered call handling, appointment scheduling, quoting, invoicing, and team messaging.

## Features

- **Multi-Tenant Architecture** - Isolated data per business with PostgreSQL Row-Level Security
- **Appointment Scheduling** - Calendar management with custom availability rules per service
- **Customer Self-Booking** - Public booking portal with email/SMS confirmations
- **Quote Generation** - Create and send professional quotes with PDF export
- **Invoicing & Payments** - Stripe integration for payment processing
- **Voice AI** - Vapi.ai integration for 24/7 AI phone call handling
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
