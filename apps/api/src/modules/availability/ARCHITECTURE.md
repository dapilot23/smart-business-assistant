# Availability Module Architecture

## Overview
The Availability module manages technician work schedules and time-off periods, integrating with the Appointments module to provide accurate available time slots.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AvailabilityController                          │
│  Routes:                                                     │
│  - GET/POST/PATCH/DELETE /availability/schedule             │
│  - GET/POST/PATCH/DELETE /availability/time-off             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AvailabilityService                             │
│  Business Logic:                                             │
│  - CRUD for TechnicianAvailability                          │
│  - CRUD for TimeOff                                          │
│  - Validation (time ranges, user ownership)                 │
│  - Conflict detection                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    PrismaService                             │
│  Database Operations:                                        │
│  - TechnicianAvailability table                             │
│  - TimeOff table                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                           │
└─────────────────────────────────────────────────────────────┘
```

## Integration Flow

```
┌──────────────────────────────────────────────────────────────┐
│              Appointment Booking Flow                         │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
         GET /appointments/available-slots
         ?date=2026-01-24&assignedTo=user_456
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│          AppointmentsSlotsService                            │
│                                                               │
│  1. Query existing appointments                              │
│  2. Get technician availability (NEW)                        │
│     ├─ Check TechnicianAvailability for day of week         │
│     └─ Check TimeOff for date range                         │
│  3. Calculate available slots                                │
│     ├─ Use technician hours if available                    │
│     └─ Fall back to default 9am-5pm                         │
│  4. Exclude booked appointment times                         │
│  5. Exclude time-off periods                                │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
                  Return available slots
```

## Data Models

### TechnicianAvailability
Represents a technician's regular weekly schedule.

**Key Features:**
- One record per technician per day of week
- Unique constraint on (tenantId, userId, dayOfWeek)
- Time stored as HH:mm string for simplicity
- `isActive` flag allows temporary disabling without deletion

**Use Cases:**
- Define regular working hours (e.g., Mon-Fri 9am-5pm)
- Different schedules per day (e.g., Wed 8am-4pm, Thu 10am-6pm)
- Part-time schedules

### TimeOff
Represents exceptions to regular schedule (vacation, sick days, etc.)

**Key Features:**
- Date range with start and end timestamps
- Optional reason field for documentation
- Takes precedence over regular availability
- Can span multiple days

**Use Cases:**
- Vacation periods
- Sick leave
- Conference attendance
- Training days

## Scaling Considerations

### Current Design (Single Tenant, Low Scale)
- Direct Prisma queries
- In-memory slot calculation
- No caching

**Supports:**
- Up to 100 technicians per tenant
- Up to 1000 appointments/day
- Response time < 500ms

### Future Optimizations (Multi-Tenant, High Scale)

1. **Caching Layer**
   ```
   Redis cache for:
   - Technician availability schedules (TTL: 1 hour)
   - Time-off periods (TTL: 1 hour)
   - Invalidate on update
   ```

2. **Database Indexing**
   ```sql
   -- Already implemented
   INDEX (tenantId, userId, dayOfWeek)
   INDEX (tenantId, userId, startDate, endDate)
   ```

3. **Query Optimization**
   - Batch queries for multiple technicians
   - Denormalize frequently accessed data
   - Use database-level date range queries

4. **Horizontal Scaling**
   - Stateless service design (already implemented)
   - Load balancer ready
   - Database connection pooling

## Security & Multi-Tenancy

### Tenant Isolation
All operations enforce tenant-level isolation:

```typescript
// Every query includes tenantId
where: {
  tenantId: user.tenantId,
  userId: dto.userId
}
```

### Authorization
- JWT-based authentication via ClerkAuthGuard
- Tenant context from CurrentUser decorator
- Row-level validation in service layer

### Data Validation
- DTO validation using class-validator
- Time range validation (endTime > startTime)
- Date range validation (endDate > startDate)
- User ownership verification

## API Design Patterns

### RESTful Conventions
```
GET    /availability/schedule       - List all
GET    /availability/schedule/:id   - Get one
POST   /availability/schedule       - Create
PATCH  /availability/schedule/:id   - Update
DELETE /availability/schedule/:id   - Delete
```

### Response Patterns
- `200 OK`: Successful GET, PATCH, DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Validation errors
- `403 Forbidden`: Tenant mismatch
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate availability

### Error Handling
Centralized exception handling via NestJS:
- ValidationPipe for DTO validation
- Custom exceptions with meaningful messages
- Consistent error response format

## Database Schema Design

### Normalization
- 3NF normalized design
- Foreign key constraints to User and Tenant
- Cascade deletes for data integrity

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_availability_tenant_user
  ON technician_availability(tenant_id, user_id);

CREATE INDEX idx_availability_day
  ON technician_availability(day_of_week);

CREATE INDEX idx_timeoff_tenant_user
  ON time_off(tenant_id, user_id);

CREATE INDEX idx_timeoff_dates
  ON time_off(start_date, end_date);
```

### Unique Constraints
```sql
-- Prevent duplicate availability for same day
UNIQUE(tenant_id, user_id, day_of_week)
```

## Testing Strategy

### Unit Tests (TODO)
- Service layer validation logic
- Time range calculations
- Conflict detection

### Integration Tests (TODO)
- Database operations
- Multi-tenant isolation
- API endpoint responses

### E2E Tests (TODO)
- Complete booking flow with availability
- Time-off blocking appointments
- Schedule updates reflecting in slots

## Future Enhancements

### Potential Features
1. **Recurring Time Off**
   - Weekly recurring days off
   - Holiday schedules

2. **Capacity Management**
   - Multiple technicians per slot
   - Service-specific technician skills

3. **Advanced Scheduling**
   - Break times within work hours
   - Minimum gap between appointments
   - Travel time between appointments

4. **Analytics**
   - Utilization rates per technician
   - Popular booking times
   - Availability gaps

### Performance Improvements
1. Database read replicas for slot calculations
2. Background job for pre-calculating daily slots
3. WebSocket updates for real-time availability changes
4. GraphQL for flexible availability queries
