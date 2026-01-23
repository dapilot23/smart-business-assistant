# Availability Module - Quick Start Guide

## Setup

Already completed. The module is registered in `/home/ubuntu/smart-business-assistant/apps/api/src/app.module.ts`

## API Endpoints

### Create Technician Schedule
```http
POST /availability/schedule
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user_123",
  "dayOfWeek": 1,           // 0=Sunday, 6=Saturday
  "startTime": "09:00",     // HH:mm format
  "endTime": "17:00",       // HH:mm format
  "isActive": true
}
```

### Get All Schedules
```http
GET /availability/schedule
GET /availability/schedule?userId=user_123
```

### Update Schedule
```http
PATCH /availability/schedule/:id
Content-Type: application/json

{
  "startTime": "08:00",
  "endTime": "16:00"
}
```

### Create Time Off
```http
POST /availability/time-off
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user_123",
  "startDate": "2026-01-25T00:00:00Z",
  "endDate": "2026-01-27T23:59:59Z",
  "reason": "Vacation"
}
```

### Get Available Slots (with availability check)
```http
GET /appointments/available-slots?date=2026-01-24&assignedTo=user_123
```

Returns slots only within technician's available hours and excludes time-off periods.

## Common Use Cases

### 1. Set Up Weekly Schedule
Create one record per day the technician works:

```javascript
// Monday 9am-5pm
POST /availability/schedule { userId, dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }

// Tuesday 9am-5pm
POST /availability/schedule { userId, dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }

// Wednesday 8am-4pm (different hours)
POST /availability/schedule { userId, dayOfWeek: 3, startTime: "08:00", endTime: "16:00" }
```

### 2. Block Out Vacation
```javascript
POST /availability/time-off {
  userId: "user_123",
  startDate: "2026-02-01T00:00:00Z",
  endDate: "2026-02-07T23:59:59Z",
  reason: "Winter vacation"
}
```

### 3. Check What Slots Are Available
```javascript
// Without technician - uses default 9am-5pm
GET /appointments/available-slots?date=2026-01-24

// With technician - uses their custom hours
GET /appointments/available-slots?date=2026-01-24&assignedTo=user_123
```

## Validation Rules

### Time Format
- Must be HH:mm (e.g., "09:00", "17:30")
- endTime must be after startTime

### Day of Week
- Integer 0-6
- 0 = Sunday, 1 = Monday, ..., 6 = Saturday

### Date Range
- ISO 8601 format required
- endDate must be after startDate

### Unique Constraint
- One schedule per technician per day of week
- Creating duplicate returns 409 Conflict

## Error Responses

```javascript
// 400 Bad Request
{ "statusCode": 400, "message": "End time must be after start time" }

// 404 Not Found
{ "statusCode": 404, "message": "User not found" }

// 409 Conflict
{ "statusCode": 409, "message": "Availability already exists for this day. Use update instead." }
```

## Database Models

### TechnicianAvailability
```typescript
{
  id: string
  tenantId: string
  userId: string
  dayOfWeek: number      // 0-6
  startTime: string      // "HH:mm"
  endTime: string        // "HH:mm"
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

### TimeOff
```typescript
{
  id: string
  tenantId: string
  userId: string
  startDate: DateTime
  endDate: DateTime
  reason?: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

## Integration with Appointments

When `assignedTo` is provided to `/appointments/available-slots`:

1. System checks TechnicianAvailability for that day of week
2. System checks TimeOff for that date
3. If on time-off: returns empty array
4. If has schedule: uses custom hours
5. If no schedule: uses default 9am-5pm

## File Locations

- DTOs: `/home/ubuntu/smart-business-assistant/apps/api/src/modules/availability/dto/`
- Services: `/home/ubuntu/smart-business-assistant/apps/api/src/modules/availability/*.service.ts`
- Controller: `/home/ubuntu/smart-business-assistant/apps/api/src/modules/availability/availability.controller.ts`
- Schema: `/home/ubuntu/smart-business-assistant/apps/api/prisma/schema.prisma`

## Testing (TODO)

```bash
# When tests are added
npm test -- availability.service.spec
npm test -- availability.controller.spec
npm run test:e2e -- availability.e2e-spec
```
