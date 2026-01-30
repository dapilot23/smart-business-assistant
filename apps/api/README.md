# Smart Business Assistant API

NestJS-based REST API for the Smart Business Assistant platform.

## Features

- Multi-tenant architecture
- JWT-based authentication
- Prisma ORM with PostgreSQL
- Integration modules for:
  - Voice calls (Vapi)
  - SMS messaging (Twilio)
  - Payment processing (Stripe)

## Project Structure

```
src/
├── common/           # Shared utilities
│   ├── guards/      # Authentication guards
│   ├── decorators/  # Custom decorators
│   ├── filters/     # Exception filters
│   └── interceptors/# Request/response interceptors
├── config/          # Configuration modules
│   └── prisma/      # Prisma service
├── modules/         # Feature modules
│   ├── auth/        # Authentication
│   ├── tenants/     # Tenant management
│   ├── customers/   # Customer CRUD
│   ├── appointments/# Appointment scheduling
│   ├── quotes/      # Quote generation
│   ├── invoices/    # Invoice management
│   ├── voice/       # Vapi integration
│   ├── sms/         # Twilio integration
│   └── payments/    # Stripe integration
├── app.module.ts    # Root module
└── main.ts          # Application entry point
```

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Set up database:
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

If you are upgrading an existing local database created before the migration
squash, reset it first:
```bash
pnpm prisma:reset
pnpm prisma:seed
```

4. Start development server:
```bash
pnpm dev
```

## Available Scripts

- `pnpm dev` - Start in development mode with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run all tests
- `pnpm test:unit` - Run unit tests only
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio

## API Endpoints

### Health
- `GET /api/v1/health` - Health check endpoint

### Authentication
- `POST /api/v1/auth/register` - Register new tenant
- `POST /api/v1/auth/login` - Login

### Tenants
- `GET /api/v1/tenants/me` - Get current tenant
- `PATCH /api/v1/tenants/me` - Update current tenant

### Customers
- `GET /api/v1/customers` - List all customers
- `GET /api/v1/customers/:id` - Get customer details
- `POST /api/v1/customers` - Create customer
- `PATCH /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer

### Appointments
- `GET /api/v1/appointments` - List all appointments
- `GET /api/v1/appointments/:id` - Get appointment details
- `POST /api/v1/appointments` - Create appointment
- `PATCH /api/v1/appointments/:id` - Update appointment
- `DELETE /api/v1/appointments/:id` - Delete appointment

### Quotes
- `GET /api/v1/quotes` - List all quotes
- `GET /api/v1/quotes/:id` - Get quote details
- `POST /api/v1/quotes` - Create quote
- `PATCH /api/v1/quotes/:id/status` - Update quote status

### Invoices
- `GET /api/v1/invoices` - List all invoices
- `GET /api/v1/invoices/:id` - Get invoice details
- `POST /api/v1/invoices` - Create invoice
- `PATCH /api/v1/invoices/:id/status` - Update invoice status

### Voice (Vapi)
- `POST /api/v1/voice/call` - Initiate voice call
- `POST /api/v1/voice/webhook` - Vapi webhook endpoint

### SMS (Twilio)
- `POST /api/v1/sms/send` - Send SMS
- `POST /api/v1/sms/webhook` - Twilio webhook endpoint

### Payments (Stripe)
- `POST /api/v1/payments/create-intent` - Create payment intent
- `POST /api/v1/payments/webhook` - Stripe webhook endpoint

## Development Guidelines

- All files must be under 200 lines
- All functions must be under 50 lines
- Use DTOs for request validation
- All database queries must be tenant-scoped
- Use guards for authentication/authorization
- Document TODO items for incomplete features
