# Phase 6: Polish & Launch - Backend Implementation

This document describes the backend services implemented for Phase 6 of the Smart Business Assistant.

## Overview

Phase 6 adds analytics, settings management, review request automation, and enhanced onboarding capabilities.

## Modules Implemented

### 1. Reports Module (`src/modules/reports/`)

Provides analytics and reporting endpoints for business insights.

#### Endpoints

- **GET /reports/dashboard** - Dashboard overview stats
  - Returns: Total revenue (current month), total appointments, customers, calls, pending quotes, jobs in progress

- **GET /reports/revenue?period=30d** - Revenue chart data
  - Query params: `period` (7d, 30d, 12m)
  - Returns: Revenue grouped by day or month

- **GET /reports/appointments?period=30d** - Appointment statistics
  - Query params: `period` (7d, 30d, 12m)
  - Returns: Appointment counts by status

- **GET /reports/services** - Top services by bookings
  - Returns: Most booked services with booking counts

- **GET /reports/team** - Team performance metrics
  - Returns: Completed jobs per technician

#### Files
```
src/modules/reports/
├── dto/
│   └── report-filter.dto.ts
├── reports.controller.ts
├── reports.service.ts
└── reports.module.ts
```

---

### 2. Settings Module (`src/modules/settings/`)

Manages tenant-specific settings and business configuration.

#### Database Schema

```prisma
model TenantSettings {
  id                   String   @id @default(cuid())
  tenantId             String   @unique
  businessHours        Json?
  timezone             String   @default("America/New_York")
  appointmentReminders Boolean  @default(true)
  reminderHoursBefore  Int      @default(24)
  autoConfirmBookings  Boolean  @default(false)
  reviewRequestEnabled Boolean  @default(true)
  reviewRequestDelay   Int      @default(24)
  googleReviewUrl      String?
  yelpReviewUrl        String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

#### Endpoints

- **GET /settings** - Get current tenant settings
  - Auto-creates default settings if none exist

- **PATCH /settings** - Update tenant settings
  - Body: Partial settings object

#### Default Business Hours

```json
{
  "monday": { "start": "09:00", "end": "17:00" },
  "tuesday": { "start": "09:00", "end": "17:00" },
  "wednesday": { "start": "09:00", "end": "17:00" },
  "thursday": { "start": "09:00", "end": "17:00" },
  "friday": { "start": "09:00", "end": "17:00" },
  "saturday": { "start": "09:00", "end": "13:00" },
  "sunday": { "start": "", "end": "" }
}
```

#### Files
```
src/modules/settings/
├── dto/
│   └── update-settings.dto.ts
├── settings.controller.ts
├── settings.service.ts
└── settings.module.ts
```

---

### 3. Review Requests Module (`src/modules/review-requests/`)

Automates customer review requests after job completion.

#### Database Schema

```prisma
model ReviewRequest {
  id         String              @id @default(cuid())
  tenantId   String
  jobId      String              @unique
  customerId String
  status     ReviewRequestStatus @default(PENDING)
  sentAt     DateTime?
  clickedAt  DateTime?
  platform   String?
  createdAt  DateTime            @default(now())
}

enum ReviewRequestStatus {
  PENDING
  SENT
  CLICKED
  SKIPPED
}
```

#### Endpoints

- **GET /review-requests** - List all review requests
  - Returns: Review requests with customer and job details

- **GET /review-requests/stats** - Get review statistics
  - Returns: Total, by status, and click rate

- **POST /review-requests** - Create review request
  - Body: `{ jobId: string }`

- **POST /review-requests/:id/send** - Manually send review request

- **GET /review-requests/:id/redirect/:platform** - Public redirect URL
  - Params: `platform` (google or yelp)
  - Tracks click and redirects to review platform

#### Automated Processing

A scheduled job runs every hour to:
1. Find completed jobs past the configured delay period
2. Check if tenant has review requests enabled
3. Send pending review requests via SMS/email
4. Track send status

#### Files
```
src/modules/review-requests/
├── dto/
│   └── create-review-request.dto.ts
├── review-requests.controller.ts
├── review-requests.service.ts
└── review-requests.module.ts
```

---

### 4. Enhanced Tenants Module

Added onboarding functionality to the existing tenants module.

#### New Methods

**`createTenantWithOwner(data)`**
- Creates a new tenant with an owner user
- Initializes default settings
- Atomic transaction ensures consistency

**`completeOnboarding(tenantId, step, data)`**
- Tracks onboarding progress
- Can be extended for multi-step onboarding

#### New Endpoints

- **POST /tenants/onboard** - Create new tenant with owner (public)
  - Body: CreateTenantWithOwnerDto
  - Returns: { tenant, owner, settings }

- **POST /tenants/onboarding/complete** - Mark onboarding step complete
  - Body: `{ step: string, data: any }`

#### DTO
```typescript
CreateTenantWithOwnerDto {
  tenantName: string;
  tenantSlug: string;
  tenantEmail: string;
  tenantPhone?: string;
  ownerName: string;
  ownerEmail: string;
  ownerClerkId: string;
}
```

#### Files
```
src/modules/tenants/
├── dto/
│   └── create-tenant-with-owner.dto.ts
├── tenants.controller.ts (updated)
└── tenants.service.ts (updated)
```

---

## Database Changes

All schema changes have been applied using `prisma db push`.

### New Tables
- `tenant_settings` - Tenant configuration
- `review_requests` - Review request tracking

### Relations Added
- `Tenant.settings` - One-to-one with TenantSettings
- `Tenant.reviewRequests` - One-to-many with ReviewRequest
- `Job.reviewRequest` - One-to-one with ReviewRequest
- `Customer.reviewRequests` - One-to-many with ReviewRequest

---

## Testing

To test the new endpoints:

### 1. Reports
```bash
# Get dashboard stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/reports/dashboard

# Get revenue chart
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/reports/revenue?period=30d"
```

### 2. Settings
```bash
# Get settings
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/settings

# Update settings
curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reviewRequestEnabled": true, "reviewRequestDelay": 48}' \
  http://localhost:3000/settings
```

### 3. Review Requests
```bash
# Create review request
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "job123"}' \
  http://localhost:3000/review-requests

# Get stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/review-requests/stats
```

### 4. Onboarding
```bash
# Create tenant with owner
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "tenantName": "ACME Corp",
    "tenantSlug": "acme-corp",
    "tenantEmail": "admin@acme.com",
    "ownerName": "John Doe",
    "ownerEmail": "john@acme.com",
    "ownerClerkId": "clerk_123"
  }' \
  http://localhost:3000/tenants/onboard
```

---

## Architecture Highlights

### Service Patterns
All services follow consistent patterns:
- Constructor injection of PrismaService
- Private validation methods
- Multi-tenant isolation via `tenantId` filtering
- Proper error handling with domain-specific exceptions

### Security
- All protected endpoints use `ClerkAuthGuard`
- Tenant context validated on every request
- Public endpoints (redirect URL) don't require auth
- Row-level tenant isolation in queries

### Performance
- Efficient aggregations for analytics
- Grouped queries for team/service stats
- Indexed fields for common queries
- Transaction support for atomic operations

### Scalability
- Scheduled jobs use NestJS ScheduleModule
- Batch processing for review requests
- Configurable delay periods per tenant
- Async/await throughout for non-blocking I/O

---

## Configuration

Required environment variables remain the same. The modules use existing:
- `DATABASE_URL` - PostgreSQL connection
- Clerk authentication via existing setup

---

## Next Steps

1. **Frontend Integration**: Connect React dashboard to new endpoints
2. **Email/SMS Templates**: Add templates for review requests
3. **Advanced Analytics**: Add more chart types (funnel, cohorts)
4. **Export Reports**: Add CSV/PDF export functionality
5. **Review Platforms**: Integrate actual Google/Yelp APIs
6. **Onboarding Flow**: Build multi-step onboarding wizard

---

## File Structure Summary

```
/home/ubuntu/smart-business-assistant/apps/api/
├── prisma/
│   └── schema.prisma (updated)
├── src/
│   ├── app.module.ts (updated)
│   └── modules/
│       ├── reports/
│       │   ├── dto/
│       │   │   └── report-filter.dto.ts
│       │   ├── reports.controller.ts
│       │   ├── reports.service.ts
│       │   └── reports.module.ts
│       ├── settings/
│       │   ├── dto/
│       │   │   └── update-settings.dto.ts
│       │   ├── settings.controller.ts
│       │   ├── settings.service.ts
│       │   └── settings.module.ts
│       ├── review-requests/
│       │   ├── dto/
│       │   │   └── create-review-request.dto.ts
│       │   ├── review-requests.controller.ts
│       │   ├── review-requests.service.ts
│       │   └── review-requests.module.ts
│       └── tenants/
│           ├── dto/
│           │   └── create-tenant-with-owner.dto.ts
│           ├── tenants.controller.ts (updated)
│           └── tenants.service.ts (updated)
└── PHASE6_IMPLEMENTATION.md (this file)
```

---

## API Reference

All endpoints are prefixed with the base URL (e.g., `http://localhost:3000`).

### Reports API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /reports/dashboard | Yes | Dashboard overview stats |
| GET | /reports/revenue | Yes | Revenue chart data |
| GET | /reports/appointments | Yes | Appointment statistics |
| GET | /reports/services | Yes | Top services |
| GET | /reports/team | Yes | Team performance |

### Settings API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /settings | Yes | Get settings |
| PATCH | /settings | Yes | Update settings |

### Review Requests API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /review-requests | Yes | List requests |
| GET | /review-requests/stats | Yes | Get statistics |
| POST | /review-requests | Yes | Create request |
| POST | /review-requests/:id/send | Yes | Send request |
| GET | /review-requests/:id/redirect/:platform | No | Track & redirect |

### Tenants API (New)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /tenants/onboard | No | Create tenant & owner |
| POST | /tenants/onboarding/complete | Yes | Complete onboarding step |
