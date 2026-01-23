# Phase 6 API Examples

## Reports API

### Dashboard Stats
```bash
GET /reports/dashboard
```

**Response:**
```json
{
  "totalRevenue": 15750.50,
  "totalAppointments": 45,
  "totalCustomers": 123,
  "totalCalls": 67,
  "pendingQuotes": 8,
  "jobsInProgress": 12
}
```

---

### Revenue Chart
```bash
GET /reports/revenue?period=7d
```

**Response:**
```json
[
  { "date": "2026-01-17", "revenue": 1250.00 },
  { "date": "2026-01-18", "revenue": 2100.00 },
  { "date": "2026-01-19", "revenue": 980.50 },
  { "date": "2026-01-20", "revenue": 3250.00 },
  { "date": "2026-01-21", "revenue": 1890.00 },
  { "date": "2026-01-22", "revenue": 2450.00 },
  { "date": "2026-01-23", "revenue": 3830.00 }
]
```

---

### Appointment Statistics
```bash
GET /reports/appointments?period=30d
```

**Response:**
```json
[
  { "status": "SCHEDULED", "count": 15 },
  { "status": "CONFIRMED", "count": 8 },
  { "status": "COMPLETED", "count": 42 },
  { "status": "CANCELLED", "count": 3 }
]
```

---

### Top Services
```bash
GET /reports/services
```

**Response:**
```json
[
  {
    "serviceId": "srv_123",
    "serviceName": "HVAC Maintenance",
    "price": 125.00,
    "bookings": 34
  },
  {
    "serviceId": "srv_456",
    "serviceName": "Plumbing Repair",
    "price": 95.00,
    "bookings": 28
  },
  {
    "serviceId": "srv_789",
    "serviceName": "Electrical Inspection",
    "price": 85.00,
    "bookings": 22
  }
]
```

---

### Team Performance
```bash
GET /reports/team
```

**Response:**
```json
[
  {
    "technicianId": "usr_123",
    "technicianName": "John Smith",
    "completedJobs": 45
  },
  {
    "technicianId": "usr_456",
    "technicianName": "Sarah Johnson",
    "completedJobs": 38
  },
  {
    "technicianId": "usr_789",
    "technicianName": "Mike Wilson",
    "completedJobs": 32
  }
]
```

---

## Settings API

### Get Settings
```bash
GET /settings
```

**Response:**
```json
{
  "id": "set_123",
  "tenantId": "ten_456",
  "businessHours": {
    "monday": { "start": "09:00", "end": "17:00" },
    "tuesday": { "start": "09:00", "end": "17:00" },
    "wednesday": { "start": "09:00", "end": "17:00" },
    "thursday": { "start": "09:00", "end": "17:00" },
    "friday": { "start": "09:00", "end": "17:00" },
    "saturday": { "start": "09:00", "end": "13:00" },
    "sunday": { "start": "", "end": "" }
  },
  "timezone": "America/New_York",
  "appointmentReminders": true,
  "reminderHoursBefore": 24,
  "autoConfirmBookings": false,
  "reviewRequestEnabled": true,
  "reviewRequestDelay": 24,
  "googleReviewUrl": "https://g.page/r/...",
  "yelpReviewUrl": "https://www.yelp.com/...",
  "createdAt": "2026-01-15T10:30:00.000Z",
  "updatedAt": "2026-01-23T14:22:00.000Z"
}
```

---

### Update Settings
```bash
PATCH /settings
Content-Type: application/json

{
  "reviewRequestEnabled": true,
  "reviewRequestDelay": 48,
  "googleReviewUrl": "https://g.page/r/CdV6ZYq_example"
}
```

**Response:**
```json
{
  "id": "set_123",
  "tenantId": "ten_456",
  "businessHours": { ... },
  "timezone": "America/New_York",
  "appointmentReminders": true,
  "reminderHoursBefore": 24,
  "autoConfirmBookings": false,
  "reviewRequestEnabled": true,
  "reviewRequestDelay": 48,
  "googleReviewUrl": "https://g.page/r/CdV6ZYq_example",
  "yelpReviewUrl": "https://www.yelp.com/...",
  "createdAt": "2026-01-15T10:30:00.000Z",
  "updatedAt": "2026-01-23T14:25:00.000Z"
}
```

---

## Review Requests API

### List Review Requests
```bash
GET /review-requests
```

**Response:**
```json
[
  {
    "id": "rev_123",
    "tenantId": "ten_456",
    "jobId": "job_789",
    "customerId": "cus_012",
    "status": "SENT",
    "sentAt": "2026-01-22T10:00:00.000Z",
    "clickedAt": null,
    "platform": null,
    "createdAt": "2026-01-21T14:30:00.000Z",
    "customer": {
      "id": "cus_012",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+1234567890"
    },
    "job": {
      "id": "job_789",
      "status": "COMPLETED",
      "completedAt": "2026-01-21T16:00:00.000Z",
      "appointment": {
        "id": "apt_345",
        "scheduledAt": "2026-01-21T10:00:00.000Z",
        "service": {
          "name": "HVAC Maintenance"
        }
      }
    }
  }
]
```

---

### Get Review Stats
```bash
GET /review-requests/stats
```

**Response:**
```json
{
  "total": 50,
  "byStatus": [
    { "status": "PENDING", "count": 5 },
    { "status": "SENT", "count": 30 },
    { "status": "CLICKED", "count": 12 },
    { "status": "SKIPPED", "count": 3 }
  ],
  "clickRate": 24.0
}
```

---

### Create Review Request
```bash
POST /review-requests
Content-Type: application/json

{
  "jobId": "job_789"
}
```

**Response:**
```json
{
  "id": "rev_124",
  "tenantId": "ten_456",
  "jobId": "job_789",
  "customerId": "cus_013",
  "status": "PENDING",
  "sentAt": null,
  "clickedAt": null,
  "platform": null,
  "createdAt": "2026-01-23T15:00:00.000Z",
  "customer": {
    "id": "cus_013",
    "name": "Bob Smith",
    "email": "bob@example.com",
    "phone": "+1987654321"
  },
  "job": {
    "id": "job_789",
    "status": "COMPLETED",
    "completedAt": "2026-01-23T14:30:00.000Z",
    "appointment": { ... }
  }
}
```

---

### Send Review Request
```bash
POST /review-requests/rev_124/send
```

**Response:**
```json
{
  "success": true,
  "message": "Review request sent"
}
```

---

### Public Redirect (No Auth)
```bash
GET /review-requests/rev_123/redirect/google
```

**Response:**
```json
{
  "url": "https://g.page/r/CdV6ZYq_example"
}
```

This endpoint tracks the click and returns the review platform URL for redirect.

---

## Tenants API

### Create Tenant with Owner (Onboarding)
```bash
POST /tenants/onboard
Content-Type: application/json

{
  "tenantName": "ACME Plumbing",
  "tenantSlug": "acme-plumbing",
  "tenantEmail": "admin@acmeplumbing.com",
  "tenantPhone": "+15551234567",
  "ownerName": "John Doe",
  "ownerEmail": "john@acmeplumbing.com",
  "ownerClerkId": "user_2abc123xyz"
}
```

**Response:**
```json
{
  "tenant": {
    "id": "ten_789",
    "name": "ACME Plumbing",
    "slug": "acme-plumbing",
    "email": "admin@acmeplumbing.com",
    "phone": "+15551234567",
    "createdAt": "2026-01-23T15:30:00.000Z",
    "updatedAt": "2026-01-23T15:30:00.000Z"
  },
  "owner": {
    "id": "usr_901",
    "name": "John Doe",
    "email": "john@acmeplumbing.com",
    "clerkId": "user_2abc123xyz",
    "role": "OWNER",
    "status": "ACTIVE",
    "tenantId": "ten_789",
    "joinedAt": "2026-01-23T15:30:00.000Z",
    "createdAt": "2026-01-23T15:30:00.000Z",
    "updatedAt": "2026-01-23T15:30:00.000Z"
  },
  "settings": {
    "id": "set_234",
    "tenantId": "ten_789",
    "businessHours": {
      "monday": { "start": "09:00", "end": "17:00" },
      "tuesday": { "start": "09:00", "end": "17:00" },
      "wednesday": { "start": "09:00", "end": "17:00" },
      "thursday": { "start": "09:00", "end": "17:00" },
      "friday": { "start": "09:00", "end": "17:00" },
      "saturday": { "start": "09:00", "end": "13:00" },
      "sunday": { "start": "", "end": "" }
    },
    "timezone": "America/New_York",
    "appointmentReminders": true,
    "reminderHoursBefore": 24,
    "autoConfirmBookings": false,
    "reviewRequestEnabled": true,
    "reviewRequestDelay": 24,
    "googleReviewUrl": null,
    "yelpReviewUrl": null,
    "createdAt": "2026-01-23T15:30:00.000Z",
    "updatedAt": "2026-01-23T15:30:00.000Z"
  }
}
```

---

### Complete Onboarding Step
```bash
POST /tenants/onboarding/complete
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "step": "services_configured",
  "data": {
    "servicesAdded": 3
  }
}
```

**Response:**
```json
{
  "id": "ten_789",
  "name": "ACME Plumbing",
  "slug": "acme-plumbing",
  "email": "admin@acmeplumbing.com",
  "phone": "+15551234567",
  "createdAt": "2026-01-23T15:30:00.000Z",
  "updatedAt": "2026-01-23T16:00:00.000Z"
}
```

---

## Error Responses

All endpoints return consistent error formats:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Job must be completed before requesting review",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Review request not found",
  "error": "Not Found"
}
```

---

## Notes

- All authenticated endpoints require `Authorization: Bearer <clerk_token>` header
- Dates are in ISO 8601 format (UTC)
- All monetary values are in floating point (e.g., 125.50)
- Phone numbers should be in E.164 format (e.g., +15551234567)
- Tenant context is automatically extracted from the JWT token for protected routes
