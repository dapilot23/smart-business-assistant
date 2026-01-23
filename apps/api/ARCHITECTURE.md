# API Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│         (Next.js Web App, Mobile PWA, External APIs)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway Layer                        │
│                  (NestJS + Express)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CORS │ Validation │ Auth Guards │ Exception Filters │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│                    (NestJS Modules)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │    Auth     │  │  Tenants    │  │    Customers     │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │Appointments │  │   Quotes    │  │    Invoices      │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   Voice     │  │     SMS     │  │    Payments      │   │
│  │  (Vapi.ai)  │  │  (Twilio)   │  │   (Stripe)       │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
│                   (Prisma ORM + PostgreSQL)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Multi-Tenant Isolation │ Connection Pooling          │  │
│  │  Row-Level Security     │ Optimistic Locking          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Vapi.ai    │  │   Twilio    │  │     Stripe       │   │
│  │   Voice     │  │     SMS     │  │    Payments      │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

### Core Modules

#### 1. Auth Module
**Purpose**: User authentication and authorization

**Responsibilities**:
- User registration with tenant creation
- JWT token generation and validation
- Password hashing and verification
- Session management

**Key Files**:
- `auth.service.ts` - Business logic
- `auth.controller.ts` - HTTP endpoints
- `strategies/jwt.strategy.ts` - Passport JWT strategy
- `dto/login.dto.ts`, `dto/register.dto.ts` - Validation

**Endpoints**:
- `POST /auth/register` - Create new tenant + admin user
- `POST /auth/login` - Authenticate and get JWT token

---

#### 2. Tenants Module
**Purpose**: Tenant (business) management

**Responsibilities**:
- Tenant profile management
- Tenant settings
- Multi-tenant isolation

**Key Files**:
- `tenants.service.ts` - CRUD operations
- `tenants.controller.ts` - HTTP endpoints

**Endpoints**:
- `GET /tenants/me` - Get current tenant
- `PATCH /tenants/me` - Update tenant profile

---

#### 3. Customers Module
**Purpose**: Customer relationship management

**Responsibilities**:
- Customer CRUD operations
- Customer contact information
- Tenant-scoped customer access
- Customer history tracking

**Key Files**:
- `customers.service.ts` - Business logic
- `customers.controller.ts` - HTTP endpoints

**Endpoints**:
- `GET /customers` - List all customers
- `GET /customers/:id` - Get customer details
- `POST /customers` - Create customer
- `PATCH /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

---

#### 4. Appointments Module
**Purpose**: Appointment scheduling and management

**Responsibilities**:
- Appointment CRUD operations
- Conflict detection
- Status management (SCHEDULED, CONFIRMED, COMPLETED, CANCELLED)
- Calendar integration

**Key Files**:
- `appointments.service.ts` - Scheduling logic
- `appointments.controller.ts` - HTTP endpoints

**Endpoints**:
- `GET /appointments` - List appointments
- `GET /appointments/:id` - Get appointment details
- `POST /appointments` - Create appointment
- `PATCH /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Cancel appointment

---

#### 5. Quotes Module
**Purpose**: Quote/estimate generation

**Responsibilities**:
- Quote creation with line items
- Quote number generation
- Status tracking (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED)
- Quote to invoice conversion

**Key Files**:
- `quotes.service.ts` - Quote management
- `quotes.controller.ts` - HTTP endpoints

**Endpoints**:
- `GET /quotes` - List quotes
- `GET /quotes/:id` - Get quote details
- `POST /quotes` - Create quote
- `PATCH /quotes/:id/status` - Update status

---

#### 6. Invoices Module
**Purpose**: Invoice generation and payment tracking

**Responsibilities**:
- Invoice creation with line items
- Invoice number generation
- Payment status tracking (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
- Integration with Stripe

**Key Files**:
- `invoices.service.ts` - Invoice management
- `invoices.controller.ts` - HTTP endpoints

**Endpoints**:
- `GET /invoices` - List invoices
- `GET /invoices/:id` - Get invoice details
- `POST /invoices` - Create invoice
- `PATCH /invoices/:id/status` - Update status

---

### Integration Modules

#### 7. Voice Module (Vapi.ai)
**Purpose**: AI-powered voice call handling

**Responsibilities**:
- Initiate outbound calls
- Handle inbound calls
- Process Vapi webhooks
- Call transcription and logging

**Key Files**:
- `voice.service.ts` - Vapi API integration
- `voice.controller.ts` - HTTP endpoints + webhooks

**Endpoints**:
- `POST /voice/call` - Initiate voice call
- `POST /voice/webhook` - Receive Vapi events

**Integration Flow**:
1. Business initiates call via API
2. Vapi.ai handles voice interaction
3. Webhooks sent for call events
4. Call logs stored in database

---

#### 8. SMS Module (Twilio)
**Purpose**: SMS messaging

**Responsibilities**:
- Send SMS messages
- Receive SMS via webhooks
- Delivery status tracking
- Message templates

**Key Files**:
- `sms.service.ts` - Twilio API integration
- `sms.controller.ts` - HTTP endpoints + webhooks

**Endpoints**:
- `POST /sms/send` - Send SMS
- `POST /sms/webhook` - Receive Twilio events

**Integration Flow**:
1. System sends SMS via Twilio API
2. Twilio delivers message
3. Status updates via webhook
4. Messages logged in database

---

#### 9. Payments Module (Stripe)
**Purpose**: Payment processing

**Responsibilities**:
- Create payment intents
- Process payments
- Handle Stripe webhooks
- Update invoice status
- Refund processing

**Key Files**:
- `payments.service.ts` - Stripe API integration
- `payments.controller.ts` - HTTP endpoints + webhooks

**Endpoints**:
- `POST /payments/create-intent` - Create payment intent
- `POST /payments/webhook` - Receive Stripe events

**Integration Flow**:
1. Invoice created
2. Payment intent generated
3. Customer completes payment
4. Webhook confirms payment
5. Invoice marked as PAID

---

## Common Layer

### Guards
- `jwt-auth.guard.ts` - Protects routes requiring authentication
- Validates JWT tokens
- Extracts user context

### Decorators
- `@Public()` - Bypasses authentication
- `@CurrentUser()` - Injects authenticated user context

### Filters
- `HttpExceptionFilter` - Formats HTTP exceptions
- `AllExceptionsFilter` - Catches unhandled errors

### Interceptors
- `LoggingInterceptor` - Logs all requests/responses

---

## Data Model

### Core Entities

```
Tenant (Business)
├── Users (Staff/Admin)
├── Customers
│   ├── Appointments
│   ├── Quotes
│   │   └── QuoteItems
│   └── Invoices
│       └── InvoiceItems
```

### Relationships
- **Tenant** has many **Users** (1:N)
- **Tenant** has many **Customers** (1:N)
- **Customer** has many **Appointments** (1:N)
- **Customer** has many **Quotes** (1:N)
- **Customer** has many **Invoices** (1:N)
- **Quote** has many **QuoteItems** (1:N)
- **Invoice** has many **InvoiceItems** (1:N)

### Tenant Isolation
- All queries filtered by `tenantId`
- JWT token includes `tenantId`
- Services validate tenant access
- Prevents cross-tenant data leaks

---

## Security

### Authentication Flow
1. User registers → Tenant + User created
2. User logs in → JWT token issued
3. Client includes token in Authorization header
4. JwtAuthGuard validates token
5. Request context includes user info

### Authorization
- All protected routes use `JwtAuthGuard`
- Services check tenant ownership
- Row-level security in database

### API Security
- CORS configured for web app
- Request validation with DTOs
- Rate limiting (to be added)
- Helmet security headers (to be added)

---

## Performance Considerations

### Database
- Indexes on frequently queried fields
- Connection pooling via Prisma
- Optimized queries with includes
- Pagination for large datasets (to be added)

### Caching
- Redis for session data (to be added)
- Query result caching (to be added)
- Rate limit counters (to be added)

### Scaling
- Stateless API design
- Horizontal scaling ready
- Load balancer compatible
- Background jobs via queues (to be added)

---

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format
```json
{
  "statusCode": 400,
  "timestamp": "2026-01-23T00:00:00.000Z",
  "message": "Validation failed",
  "errors": [...]
}
```

---

## Testing Strategy

### Unit Tests
- Test each service method in isolation
- Mock dependencies (Prisma, external APIs)
- Test business logic thoroughly

### Integration Tests
- Test API endpoints end-to-end
- Use test database
- Verify multi-tenant isolation

### E2E Tests
- Test complete user workflows
- Verify external integrations
- Test webhook handling

---

## Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing key
- `JWT_EXPIRES_IN` - Token expiration
- `PORT` - Server port
- `NODE_ENV` - Environment (development/production)
- `TWILIO_*` - Twilio credentials
- `VAPI_*` - Vapi credentials
- `STRIPE_*` - Stripe credentials

### Feature Flags (Future)
- Enable/disable integrations per tenant
- A/B testing capabilities
- Gradual rollouts

---

## Monitoring & Observability

### Logging
- Structured logging with Winston (to be added)
- Request/response logging
- Error logging with stack traces
- Audit logs for sensitive operations

### Metrics (To be added)
- Request rate and latency
- Database query performance
- External API response times
- Error rates

### Alerts (To be added)
- High error rates
- Slow response times
- Database connection issues
- External service failures

---

## Deployment

### Build Process
1. Install dependencies: `pnpm install`
2. Generate Prisma client: `pnpm prisma:generate`
3. Compile TypeScript: `pnpm build`
4. Run migrations: `pnpm prisma:migrate`
5. Start server: `pnpm start`

### Environment Setup
- Production database with backups
- Environment variables via secrets
- HTTPS/SSL certificates
- Reverse proxy (nginx/Caddy)

### CI/CD Pipeline (Recommended)
1. Run tests
2. Build application
3. Run security scans
4. Deploy to staging
5. Run smoke tests
6. Deploy to production

---

## Future Enhancements

### High Priority
- Rate limiting and API throttling
- Email notifications (Resend integration)
- File upload (S3 integration)
- PDF generation for quotes/invoices

### Medium Priority
- Real-time updates (WebSockets)
- Background job processing (Bull/BullMQ)
- Caching layer (Redis)
- Full-text search (ElasticSearch)

### Low Priority
- GraphQL API
- Webhooks for clients
- API versioning strategy
- Admin dashboard API
