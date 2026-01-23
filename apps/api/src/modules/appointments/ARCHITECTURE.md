# Appointments Module Architecture

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 AppointmentsController                      │
│  - GET /appointments (with filters)                        │
│  - GET /appointments/available-slots                       │
│  - GET /appointments/:id                                   │
│  - POST /appointments                                      │
│  - PATCH /appointments/:id                                 │
│  - DELETE /appointments/:id (soft delete)                  │
└────────────┬────────────────────────────┬──────────────────┘
             │                            │
             │                            │
             ▼                            ▼
┌───────────────────────────┐  ┌─────────────────────────────┐
│   AppointmentsService     │  │ AppointmentsSlotsService    │
│                           │  │                             │
│ - findAll(filters)        │  │ - getAvailableSlots()       │
│ - findById()              │  │ - calculateAvailableSlots() │
│ - create()                │  │ - hasConflict()             │
│ - update()                │  │                             │
│ - cancel()                │  │ Work hours: 9 AM - 5 PM     │
│                           │  │ Slot interval: 30 min       │
└───────────┬───────────────┘  └─────────────┬───────────────┘
            │                                │
            │                                │
            │         ┌──────────────────────┘
            │         │
            ▼         ▼
┌──────────────────────────────────────────────────────────┐
│          AppointmentsValidatorsService                   │
│                                                          │
│ - validateCustomer() - Check tenant ownership           │
│ - validateService() - Check tenant ownership            │
│ - validateUser() - Check tenant ownership               │
│ - checkSchedulingConflicts() - Prevent double booking   │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    PrismaService                         │
│             Database Access Layer                        │
└──────────────────────────────────────────────────────────┘
```

## Database Schema

```
┌────────────┐         ┌──────────────┐         ┌────────────┐
│   Tenant   │◄────────┤ Appointment  │────────►│  Customer  │
└────────────┘         │              │         └────────────┘
                       │ - scheduledAt│
┌────────────┐         │ - duration   │         ┌────────────┐
│  Service   │◄────────┤ - status     │────────►│    User    │
│ (NEW)      │         │ - notes      │         │ (assigned) │
│            │         └──────────────┘         └────────────┘
│ - duration │
│ - price    │
└────────────┘

Indexes:
- tenantId (all tenant isolation)
- scheduledAt (time-based queries)
- assignedTo (technician schedule)
- status (filter by status)
- customerId (customer appointments)
```

## Request Flow: Create Appointment

```
1. Client Request
   POST /appointments
   { customerId, serviceId, assignedTo, scheduledAt }
   │
   ▼
2. JwtAuthGuard
   Extract tenantId from JWT token
   │
   ▼
3. AppointmentsController
   Validate DTO with class-validator
   │
   ▼
4. AppointmentsService.create()
   │
   ├─► validateCustomer(tenantId, customerId)
   │   └─► Ensure customer belongs to tenant
   │
   ├─► validateService(tenantId, serviceId)
   │   └─► Fetch duration from service
   │
   ├─► validateUser(tenantId, assignedTo)
   │   └─► Ensure user belongs to tenant
   │
   ├─► checkSchedulingConflicts()
   │   └─► Query existing appointments
   │       └─► Check for time overlaps
   │
   └─► prisma.appointment.create()
       └─► Return appointment with relations
```

## Request Flow: Get Available Slots

```
1. Client Request
   GET /appointments/available-slots?date=2026-01-25&serviceId=clzzz
   │
   ▼
2. JwtAuthGuard
   Extract tenantId from JWT token
   │
   ▼
3. AppointmentsController
   Validate query params
   │
   ▼
4. AppointmentsSlotsService.getAvailableSlots()
   │
   ├─► validateService(tenantId, serviceId)
   │   └─► Get service duration
   │
   ├─► Query existing appointments for date
   │   └─► Filter: tenantId, date range, not cancelled
   │
   └─► calculateAvailableSlots()
       │
       ├─► Initialize: 9 AM - 5 PM workday
       ├─► Generate slots every 30 minutes
       ├─► For each slot:
       │   └─► Check hasConflict() with existing appointments
       │
       └─► Return available slots
```

## Conflict Detection Algorithm

```
Function: checkSchedulingConflicts(scheduledAt, duration, assignedTo)

1. Calculate endTime = scheduledAt + duration

2. Query appointments where:
   - tenantId matches
   - assignedTo matches
   - status != CANCELLED
   - scheduledAt < endTime (starts before this ends)

3. For each existing appointment:
   - Calculate aptEnd = aptStart + aptDuration
   - If scheduledAt < aptEnd:
     └─► CONFLICT! (overlapping time)

4. If no conflicts:
   └─► Allow booking

Time Complexity: O(n) where n = appointments for that user/day
Space Complexity: O(1)
```

## Data Validation Flow

```
┌──────────────────────────────────────────────────────┐
│              class-validator (DTOs)                  │
│ - Type checking (IsString, IsDateString)            │
│ - Value validation (Min, IsEnum)                    │
│ - Required vs Optional                              │
└─────────────────┬────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────┐
│       AppointmentsValidatorsService                  │
│ - Business logic validation                         │
│ - Tenant ownership checks                           │
│ - Entity existence checks                           │
│ - Relationship validation                           │
└─────────────────┬────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────┐
│              Prisma Client                           │
│ - Foreign key constraints                           │
│ - Data type enforcement                             │
│ - Default values                                    │
└──────────────────────────────────────────────────────┘
```

## Status Transitions

```
         CREATE
            │
            ▼
      ┌───────────┐
      │ SCHEDULED │
      └─────┬─────┘
            │
            ├──────► CONFIRMED (manual/automated confirmation)
            │
            └──────► CANCELLED (customer/admin cancellation)
                          │
      ┌───────────┐       │
      │ CONFIRMED │       │
      └─────┬─────┘       │
            │             │
            ├──────► IN_PROGRESS (technician starts work)
            │             │
            └──────►──────┘

      ┌─────────────┐
      │ IN_PROGRESS │
      └──────┬──────┘
             │
             ├──────► COMPLETED (work finished)
             │
             └──────► CANCELLED (rare, emergency cancellation)
```

## Scaling Considerations

### Current Bottlenecks
1. **Conflict Check**: O(n) query per booking
   - Mitigated by index on (tenantId, assignedTo, scheduledAt)
   - Consider Redis cache for hot technicians

2. **Available Slots**: Generates slots for entire day
   - Currently acceptable for 8-hour workday
   - Consider pagination for multi-day queries

### Future Optimizations
1. **Caching Strategy**
   - Cache available slots per technician/day (invalidate on booking)
   - TTL: 5 minutes for high-traffic scenarios

2. **Database Partitioning**
   - Partition by tenantId for multi-tenant scaling
   - Consider time-based partitioning for large datasets

3. **Read Replicas**
   - Route available-slots queries to read replica
   - Master for write operations only

### Horizontal Scaling
- Service is stateless (no session data)
- Can scale controller instances behind load balancer
- Database connection pooling configured in PrismaService

## Error Handling Strategy

```
Controller Layer:
- Validation errors (400) from class-validator
- JWT errors (401) from JwtAuthGuard

Service Layer:
- NotFound (404) - Entity doesn't exist
- Forbidden (403) - Wrong tenant
- BadRequest (400) - Invalid business logic
- Conflict (409) - Scheduling conflict

Database Layer:
- Connection errors → 500
- Constraint violations → 400/409
```

## Code Organization (CLAUDE.md Compliance)

```
All files under 200 lines ✓
All functions under 50 lines ✓

appointments.controller.ts        - 79 lines
appointments.service.ts          - 176 lines ✓
appointments-validators.service.ts - 95 lines ✓
appointments-slots.service.ts     - 96 lines ✓
appointments.module.ts            - 15 lines ✓

DTOs:
create-appointment.dto.ts         - 26 lines ✓
update-appointment.dto.ts         - 18 lines ✓
appointment-filter.dto.ts         - 23 lines ✓
available-slots.dto.ts            - 14 lines ✓
```

## Testing Strategy (TODO)

### Unit Tests
- Validators: Test tenant isolation
- Conflict detection: Various overlap scenarios
- Slot calculation: Edge cases (start/end of day)

### Integration Tests
- Full CRUD flow with real database
- Multi-tenant isolation verification
- Concurrent booking prevention

### E2E Tests
- Complete user journey
- API contract validation
- Error response verification
