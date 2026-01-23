# Appointments API Documentation

## Overview
Enhanced appointment booking system with conflict detection, available slot calculation, and tenant-scoped operations.

## Architecture

### Service Breakdown
- **AppointmentsService**: Core CRUD operations (176 lines)
- **AppointmentsValidatorsService**: Tenant-scoped validation logic (95 lines)
- **AppointmentsSlotsService**: Available slot calculation (96 lines)

All files are under 200 lines as per CLAUDE.md constraints.

## API Endpoints

### 1. List Appointments
```
GET /appointments?startDate={ISO8601}&endDate={ISO8601}&status={STATUS}&assignedTo={userId}
Authorization: Bearer {jwt_token}
```

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `status` (optional): SCHEDULED | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED
- `assignedTo` (optional): User ID

**Response:**
```json
[
  {
    "id": "clxxx",
    "customerId": "clyyy",
    "serviceId": "clzzz",
    "assignedTo": "clwww",
    "scheduledAt": "2026-01-25T10:00:00.000Z",
    "duration": 60,
    "status": "SCHEDULED",
    "notes": "First time customer",
    "tenantId": "clqqq",
    "createdAt": "2026-01-23T00:00:00.000Z",
    "updatedAt": "2026-01-23T00:00:00.000Z",
    "customer": {
      "id": "clyyy",
      "name": "John Doe",
      "phone": "+1234567890"
    },
    "service": {
      "id": "clzzz",
      "name": "HVAC Inspection",
      "durationMinutes": 60
    },
    "assignedUser": {
      "id": "clwww",
      "name": "Jane Tech",
      "email": "jane@example.com"
    }
  }
]
```

### 2. Get Available Slots
```
GET /appointments/available-slots?date={ISO8601}&serviceId={serviceId}&assignedTo={userId}
Authorization: Bearer {jwt_token}
```

**Query Parameters:**
- `date` (required): ISO 8601 date string
- `serviceId` (optional): Service ID for duration lookup
- `assignedTo` (optional): User ID to check their availability

**Business Rules:**
- Work hours: 9 AM - 5 PM
- Slot interval: 30 minutes
- Excludes cancelled appointments
- Checks for overlapping appointments

**Response:**
```json
[
  {
    "start": "2026-01-25T09:00:00.000Z",
    "end": "2026-01-25T10:00:00.000Z"
  },
  {
    "start": "2026-01-25T10:30:00.000Z",
    "end": "2026-01-25T11:30:00.000Z"
  }
]
```

### 3. Get Single Appointment
```
GET /appointments/:id
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "id": "clxxx",
  "customerId": "clyyy",
  "serviceId": "clzzz",
  "assignedTo": "clwww",
  "scheduledAt": "2026-01-25T10:00:00.000Z",
  "duration": 60,
  "status": "SCHEDULED",
  "notes": "First time customer",
  "tenantId": "clqqq",
  "customer": { /* full customer object */ },
  "service": { /* full service object */ },
  "assignedUser": { /* user object with id, name, email */ }
}
```

### 4. Create Appointment
```
POST /appointments
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerId": "clyyy",
  "serviceId": "clzzz",
  "assignedTo": "clwww",
  "scheduledAt": "2026-01-25T10:00:00.000Z",
  "duration": 60,
  "notes": "First time customer"
}
```

**Validation Rules:**
- `customerId`: Required, must exist in tenant
- `serviceId`: Optional, must exist in tenant, duration from service
- `assignedTo`: Optional, must exist in tenant
- `scheduledAt`: Required, ISO 8601 date string
- `duration`: Optional, min 15 minutes, defaults to 60
- `notes`: Optional

**Business Logic:**
- If `serviceId` provided, duration is pulled from service
- Checks for scheduling conflicts with assignedTo user
- Status automatically set to SCHEDULED

**Response:** 201 Created with appointment object

### 5. Update Appointment
```
PATCH /appointments/:id
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "customerId": "clyyy",
  "serviceId": "clzzz",
  "assignedTo": "clwww",
  "scheduledAt": "2026-01-25T14:00:00.000Z",
  "duration": 90,
  "notes": "Updated notes",
  "status": "CONFIRMED"
}
```

**Status Values:**
- SCHEDULED
- CONFIRMED
- IN_PROGRESS
- COMPLETED
- CANCELLED

**Business Logic:**
- Validates tenant ownership
- Checks for conflicts if time/assignee changes
- Excludes current appointment from conflict check

**Response:** 200 OK with updated appointment object

### 6. Cancel Appointment
```
DELETE /appointments/:id
Authorization: Bearer {jwt_token}
```

**Business Logic:**
- Soft delete (sets status to CANCELLED)
- Does not remove from database
- Maintains audit trail

**Response:** 200 OK with cancelled appointment object

## Database Schema

### Appointment Model
```prisma
model Appointment {
  id          String            @id @default(cuid())
  customerId  String
  serviceId   String?
  assignedTo  String?
  scheduledAt DateTime
  duration    Int               @default(60)
  status      AppointmentStatus @default(SCHEDULED)
  notes       String?
  tenantId    String
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  // Relations
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  customer     Customer @relation(fields: [customerId], references: [id])
  service      Service? @relation(fields: [serviceId], references: [id])
  assignedUser User?    @relation(fields: [assignedTo], references: [id])

  @@index([tenantId])
  @@index([customerId])
  @@index([scheduledAt])
  @@index([assignedTo])
  @@index([status])
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

### Service Model (New)
```prisma
model Service {
  id              String        @id @default(cuid())
  name            String
  description     String?
  durationMinutes Int           @default(60)
  price           Float?
  tenantId        String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  appointments Appointment[]

  @@index([tenantId])
}
```

## Key Features

### Tenant Isolation
- All queries scoped by tenantId from JWT token
- Validates customer, service, and user belong to tenant
- Row-level security enforced in service layer

### Conflict Detection
- Checks for overlapping appointments when:
  - Creating new appointment
  - Updating scheduledAt, duration, or assignedTo
- Only checks if assignedTo is specified
- Excludes current appointment in updates
- Ignores cancelled appointments

### Available Slots Calculation
- Configurable work hours (9 AM - 5 PM)
- 30-minute slot intervals
- Considers service duration
- Filters by specific technician if provided
- Returns only fully available slots

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Customer not found",
  "error": "Bad Request"
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
  "message": "Appointment not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Scheduling conflict detected",
  "error": "Conflict"
}
```

## Migration Required

To apply the schema changes:
```bash
npx prisma migrate dev --name add-appointment-enhancements
```

This will:
1. Add Service table
2. Update Appointment table with new fields
3. Add IN_PROGRESS status to enum
4. Add necessary indexes

## Testing Examples

### Create appointment with service
```bash
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "clyyy",
    "serviceId": "clzzz",
    "assignedTo": "clwww",
    "scheduledAt": "2026-01-25T10:00:00.000Z",
    "notes": "First visit"
  }'
```

### Get available slots
```bash
curl -X GET "http://localhost:3000/appointments/available-slots?date=2026-01-25&serviceId=clzzz&assignedTo=clwww" \
  -H "Authorization: Bearer {token}"
```

### Filter appointments by date range
```bash
curl -X GET "http://localhost:3000/appointments?startDate=2026-01-01&endDate=2026-01-31&status=SCHEDULED" \
  -H "Authorization: Bearer {token}"
```

## Files Modified

### Created
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/dto/create-appointment.dto.ts`
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/dto/update-appointment.dto.ts`
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/dto/appointment-filter.dto.ts`
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/dto/available-slots.dto.ts`
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/dto/index.ts`
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/appointments-validators.service.ts`
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/appointments-slots.service.ts`

### Modified
- `/home/ubuntu/smart-business-assistant/apps/api/prisma/schema.prisma`
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/appointments.controller.ts`
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/appointments.service.ts`
- `/home/ubuntu/smart-business-assistant/apps/api/src/modules/appointments/appointments.module.ts`
