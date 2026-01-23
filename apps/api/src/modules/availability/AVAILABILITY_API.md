# Availability Management API

RESTful API endpoints for managing technician availability schedules and time-off periods.

## Base URL
```
/availability
```

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## Technician Availability Schedule

### Get All Availability Schedules
```http
GET /availability/schedule?userId={userId}
```

**Query Parameters:**
- `userId` (optional): Filter by specific technician

**Response:** `200 OK`
```json
[
  {
    "id": "clx123abc",
    "tenantId": "tenant_123",
    "userId": "user_456",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "17:00",
    "isActive": true,
    "createdAt": "2026-01-23T10:00:00Z",
    "updatedAt": "2026-01-23T10:00:00Z",
    "user": {
      "id": "user_456",
      "name": "John Technician",
      "email": "john@example.com"
    }
  }
]
```

### Get Single Availability Schedule
```http
GET /availability/schedule/:id
```

**Response:** `200 OK`
```json
{
  "id": "clx123abc",
  "tenantId": "tenant_123",
  "userId": "user_456",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "isActive": true,
  "createdAt": "2026-01-23T10:00:00Z",
  "updatedAt": "2026-01-23T10:00:00Z",
  "user": {
    "id": "user_456",
    "name": "John Technician",
    "email": "john@example.com"
  }
}
```

### Create Availability Schedule
```http
POST /availability/schedule
```

**Request Body:**
```json
{
  "userId": "user_456",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "isActive": true
}
```

**Validations:**
- `userId`: Required, must be valid user in tenant
- `dayOfWeek`: Required, integer 0-6 (0=Sunday, 6=Saturday)
- `startTime`: Required, format HH:mm (e.g., "09:00")
- `endTime`: Required, format HH:mm, must be after startTime
- `isActive`: Optional, boolean (default: true)

**Response:** `201 Created`
```json
{
  "id": "clx123abc",
  "tenantId": "tenant_123",
  "userId": "user_456",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "isActive": true,
  "createdAt": "2026-01-23T10:00:00Z",
  "updatedAt": "2026-01-23T10:00:00Z",
  "user": {
    "id": "user_456",
    "name": "John Technician",
    "email": "john@example.com"
  }
}
```

**Errors:**
- `409 Conflict`: Availability already exists for this day (use PATCH to update)
- `404 Not Found`: User not found
- `403 Forbidden`: User doesn't belong to tenant
- `400 Bad Request`: Invalid time range or format

### Update Availability Schedule
```http
PATCH /availability/schedule/:id
```

**Request Body:**
```json
{
  "startTime": "08:00",
  "endTime": "16:00",
  "isActive": true
}
```

**Validations:**
- All fields optional
- `startTime` and `endTime` must be in HH:mm format
- If both provided, endTime must be after startTime

**Response:** `200 OK`

### Delete Availability Schedule
```http
DELETE /availability/schedule/:id
```

**Response:** `200 OK`

---

## Time Off Management

### Get All Time Off Periods
```http
GET /availability/time-off?userId={userId}
```

**Query Parameters:**
- `userId` (optional): Filter by specific technician

**Response:** `200 OK`
```json
[
  {
    "id": "clx789xyz",
    "tenantId": "tenant_123",
    "userId": "user_456",
    "startDate": "2026-01-25T00:00:00Z",
    "endDate": "2026-01-27T23:59:59Z",
    "reason": "Vacation",
    "createdAt": "2026-01-23T10:00:00Z",
    "updatedAt": "2026-01-23T10:00:00Z",
    "user": {
      "id": "user_456",
      "name": "John Technician",
      "email": "john@example.com"
    }
  }
]
```

### Get Single Time Off Period
```http
GET /availability/time-off/:id
```

**Response:** `200 OK`

### Create Time Off Period
```http
POST /availability/time-off
```

**Request Body:**
```json
{
  "userId": "user_456",
  "startDate": "2026-01-25T00:00:00Z",
  "endDate": "2026-01-27T23:59:59Z",
  "reason": "Vacation"
}
```

**Validations:**
- `userId`: Required, must be valid user in tenant
- `startDate`: Required, ISO 8601 date string
- `endDate`: Required, ISO 8601 date string, must be after startDate
- `reason`: Optional, string description

**Response:** `201 Created`

**Errors:**
- `404 Not Found`: User not found
- `403 Forbidden`: User doesn't belong to tenant
- `400 Bad Request`: Invalid date range (end before start)

### Update Time Off Period
```http
PATCH /availability/time-off/:id
```

**Request Body:**
```json
{
  "startDate": "2026-01-25T00:00:00Z",
  "endDate": "2026-01-28T23:59:59Z",
  "reason": "Extended vacation"
}
```

**Validations:**
- All fields optional
- If dates provided, endDate must be after startDate

**Response:** `200 OK`

### Delete Time Off Period
```http
DELETE /availability/time-off/:id
```

**Response:** `200 OK`

---

## Integration with Appointment Slots

The availability module integrates with `/appointments/available-slots`:

```http
GET /appointments/available-slots?date=2026-01-24&assignedTo=user_456
```

**Behavior:**
1. Checks technician's regular availability schedule for the day of week
2. Checks if technician has time off on that date
3. Only returns slots within technician's available hours
4. Excludes time-off periods completely

**Example:**
- Regular schedule: Monday 09:00-17:00
- Time off: None
- Existing appointments: 10:00-11:00
- Result: Slots available 09:00-10:00, 11:00-17:00 (in 30-min intervals)

---

## Database Schema

### TechnicianAvailability
```sql
CREATE TABLE technician_availability (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0-6
  start_time VARCHAR NOT NULL,   -- HH:mm format
  end_time VARCHAR NOT NULL,     -- HH:mm format
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, day_of_week)
);
```

### TimeOff
```sql
CREATE TABLE time_off (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  reason VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Common Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "End time must be after start time",
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
  "message": "Availability not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Availability already exists for this day. Use update instead.",
  "error": "Conflict"
}
```
