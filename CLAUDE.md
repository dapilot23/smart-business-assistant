# Project Guidelines

## Stack
- **Monorepo**: pnpm workspaces (`pnpm-workspace.yaml`)
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Radix UI + PWA
- **Backend**: NestJS + Prisma ORM + PostgreSQL + Redis + BullMQ
- **Auth**: Clerk (multi-tenant, multi-org)
- **Voice AI**: Vapi.ai (AI phone call handling)
- **SMS**: Twilio (text messaging + inbound webhooks)
- **Payments**: Stripe (checkout, deposits, payment intents)
- **Email**: Resend (transactional email)
- **Storage**: AWS S3 or local filesystem
- **Calendar**: Google Calendar API sync
- **Image Analysis**: Anthropic Claude API (photo-based quotes)
- **Messaging**: WhatsApp Business API
- **Testing**: Jest (unit), Playwright (E2E)
- **Dev Workflow**: Ralph for AI assistant development workflows

## Product and Launch Plan (Enhanced)

### Vision
Build a simple, reliable AI employee OS for small service and product businesses that runs day-to-day work while keeping the owner in control.

### Target Users
- Owner-operators and small teams (1-20 people)
- Service businesses with appointments, dispatch, and follow-up work
- Product or hybrid businesses with quotes, invoices, and customer messaging

### Core Problems to Solve
- Too much manual follow-up (quotes, invoices, appointments)
- Fragmented tools and no single source of truth
- Hard to see what matters today
- Automation without trust or clear control

### Success Definition
- A user can complete their daily work in under 10 minutes on the Command Center
- At least 30 percent of routine tasks are auto-completed within 30 days
- Owners trust the system enough to approve actions quickly
- All visible buttons and controls do real work

### Product Principles (Best of All Worlds)
1. **Simple first, powerful when needed**: the default view is minimal; depth exists one click away.
2. **Human control with AI speed**: AI drafts and proposes; the user approves or automates with clear guardrails.
3. **One screen that matters**: the Command Center is the daily home for the business.
4. **No fake affordances**: remove or hide anything that cannot be executed today.
5. **Clear language**: use plain words, short sentences, no jargon.
6. **Data you can act on**: every metric must map to a next step.

### System Overview
- **Command Center (Dashboard)**: status line, approvals, tasks, and signals.
- **Task Ledger**: unified queue for AI actions, system tasks, and human tasks.
- **Action Engine**: idempotent execution, guardrails, undo windows, and audit logs.
- **Engagement Hub**: inbox, SMS, voice, and reviews in one place.
- **Money Control**: quotes, invoices, payments, and collections workflow.
- **Insights + Goals**: weekly reports and mission tracking.

### Architecture and Reliability Upgrades
- Unified Task Ledger with a clear state machine and trace IDs.
- Idempotent action execution with retry safety.
- Event-sourced activity timeline for audit and analytics.
- Read model cache for dashboards (short TTL with write-through invalidation).
- Queue isolation by priority (critical vs bulk workloads).
- Centralized error reporting with clear recovery paths.

### Daily Experience Blueprint
1. Open Command Center.
2. Approve or decline the top 3 actions.
3. Complete or skip the next 5 tasks.
4. Review 2-3 signals and click into detail only if needed.

### Automation Model and Trust
- **Suggest mode**: AI drafts; user approves.
- **Assist mode**: AI executes low-risk tasks with undo where possible.
- **Autopilot mode**: AI executes within guardrails and logs everything.
- Trust settings per category (billing, messaging, scheduling, marketing).
- Undo windows for risky actions and optional action previews for high risk.

### UX and Language Guidelines
- Use short, direct labels: "Approve", "Decline", "Done", "Skip".
- Keep screens under three core sections.
- Default to a single primary action per card.
- Every metric must map to a next step.
- All visible buttons must do real work.

### MVP Scope (Must Ship)
- Command Center with unified Task Ledger, approvals, and undo window.
- Appointments with smart confirmations and no-show prompts.
- Quotes and invoices with follow-up actions and payment reminders.
- Inbox with draft-first responses and one-click approve.
- Autopilot settings with per-category trust and guardrails.
- Insights summary with action buttons and weekly report generation.
- SMS and email sending, review requests.
- Observability: logs, queue health, and error recovery UI.

### Next Scope (After MVP)
- Mission Mode (goal-based automation).
- Owner Clone memory and preference learning.
- Predictive cashflow and auto-collections routing.
- Customer health score with next best action.
- Inactivity rescue playbooks (weekly summary with approvals).
- Advanced dispatch optimization.
- Voice AI improvements (testing, transfers, scripts).
- Marketing playbooks (win-back, review boost, refill reminders).
- Deeper reporting and forecasting.

### Deferred or Removed from Near Term
- Dynamic pricing (high trust risk, low early value).
- Predictive maintenance (niche, not core to daily ops).
- Complex multi-tab settings (hide advanced until needed).

### Delivery Plan
**Phase 0: Foundation (1-2 weeks)**
- Implement Task Ledger with state machine.
- Add idempotency keys and retry safety.
- Queue isolation and priority handling.
- Remove non-functional UI.
- Basic observability (errors, queue health, dashboards).

**Phase 1: Command Center (2-3 weeks)**
- Unified approvals and tasks.
- Undo window and action preview for high risk.
- Draft-first inbox.
- Onboarding flow to seed a working demo environment.

**Phase 2: Automation (2-3 weeks)**
- Trust settings per category.
- Autopilot guardrails.
- Action history and audit timeline.
- AI suggestion improvements with confidence scoring.

**Phase 3: Growth (2-4 weeks)**
- Mission Mode.
- Predictive cashflow and collections routing.
- Marketing playbooks.
- Deeper insights and forecasting.

### Performance and Safety Guardrails
- Rate limits on high-impact operations.
- Fail-closed for payments and refunds.
- Action previews for high-risk tasks.
- Automatic rollback where possible.
- Human approval required over thresholds.

### Operational Readiness
- Centralized logging for API and worker queues.
- Dead-letter handling and replay tools.
- Queue retry strategy with backoff.
- Clear error states with recovery actions.
- Alerting on failed jobs and sync errors.

### Security and Compliance
- Strict tenant isolation everywhere.
- Role-based access for team features.
- Audit logging for AI actions and money movement.
- Secure storage for PII and payment metadata.

### Analytics and KPIs
- Daily active owners.
- Time-to-first-value (first action approved).
- Approval time and approval rate.
- Trust index (auto-approve rate).
- Automation rate and time saved.
- Recovery rate for failed workflows.
- Revenue collected and invoices closed.

### Launch Readiness Checklist
- All core screens have working controls.
- Every action is idempotent and logged.
- Undo and preview for risky actions.
- Empty states and error states are clear and safe.
- Lint and critical tests pass.
- Demo data path works for new tenants.

## Development Rules
1. **Max 50 lines per function** - break larger logic into composable pieces
2. **Max 200 lines per file** - split into services/helpers if needed
3. **Test-first**: Write failing test -> implement -> verify -> commit
4. **Run tests after every change** - never proceed if tests fail
5. **One feature at a time** - complete and test before moving on
6. **Each PR/change should be independently testable**

## Commands

### Testing
```bash
pnpm test                    # Run all tests (unit + integration)
pnpm test:e2e                # Run Playwright E2E tests
pnpm test:unit               # Run unit tests
```

### Development
```bash
pnpm dev                     # Run all dev servers
pnpm dev:web                 # Web only (Next.js on port 3000)
pnpm dev:api                 # API only (NestJS on port 3001)
```

### Build
```bash
pnpm build                   # Build all projects
pnpm --filter api build      # Build API only (nest build)
pnpm --filter web build      # Build Web only (next build)
```

### Database
```bash
# From apps/api/:
npx prisma generate          # Regenerate Prisma client
npx prisma db push           # Push schema changes (dev)
npx prisma migrate dev       # Create migration (dev)
npx prisma studio            # Open Prisma Studio GUI
npx ts-node prisma/seed.ts   # Seed database
```

### Other
```bash
pnpm lint                    # Lint all projects
pnpm format                  # Format with Prettier
pnpm clean                   # Clean all node_modules + dist
```

### Node.js Path (if needed)
```bash
PATH=$HOME/.nvm/versions/node/v24.12.0/bin:$PATH pnpm test
```

## Project Structure
```
smart-business-assistant/
├── apps/
│   ├── api/                          # NestJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── main.ts               # Entry point + bootstrap
│   │   │   ├── app.module.ts          # Root module
│   │   │   ├── app.controller.ts
│   │   │   ├── app.service.ts
│   │   │   ├── common/               # Guards, decorators, middleware, interceptors
│   │   │   ├── config/               # Prisma, events, queue, cache, clerk, storage, throttle
│   │   │   ├── gateways/             # WebSocket gateways
│   │   │   ├── modules/              # Business logic (31 modules)
│   │   │   ├── scripts/              # Utility scripts
│   │   │   └── test/                 # Test fixtures (prisma-mock.ts, jest-setup.ts)
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # 50+ models
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── jest.config.js
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   └── web/                          # Next.js frontend + PWA (port 3000)
│       ├── app/
│       │   ├── (auth)/               # Login, signup
│       │   ├── (dashboard)/          # Protected routes (appointments, customers,
│       │   │                         #   jobs, quotes, invoices, availability,
│       │   │                         #   settings, sms, voice, team)
│       │   ├── book/[tenantSlug]/    # Public booking page
│       │   ├── booking/manage/[token]/ # Booking management
│       │   ├── invite/[token]/       # Team invite acceptance
│       │   └── onboarding/           # Tenant onboarding
│       ├── components/               # Reusable React components
│       ├── lib/                      # API client, helpers, validation
│       ├── tailwind.config.ts
│       ├── next.config.mjs
│       └── playwright.config.ts
│
├── packages/
│   └── shared/                       # Shared TypeScript types & utilities
│       └── src/
│           ├── types/                # tenant, user, customer, appointment,
│           │                         # quote, invoice, job
│           └── utils/                # validation, format
│
├── e2e/                              # 19 Playwright E2E test files
├── docker-compose.yml
├── pnpm-workspace.yaml
└── CLAUDE.md
```

## API Modules (apps/api/src/modules/)

| Module | Key Services | Purpose |
|--------|-------------|---------|
| **ai-scheduling** | PreferenceLearningService, RouteOptimizationService | AI scheduling + route optimization |
| **appointments** | AppointmentsService, AppointmentsSlotsService, AppointmentsValidatorsService | Appointment CRUD, slot calculation, validation |
| **auth** | AuthService | Clerk authentication integration |
| **availability** | AvailabilityService, TimeoffService | Technician schedules + time-off |
| **calendar** | CalendarService, CalendarQueueService + Processor | Google Calendar sync (BullMQ) |
| **customer-context** | CustomerContextService | AI personalization context aggregation |
| **customer-portal** | CustomerPortalAuthService + Guard | Customer-facing portal auth |
| **customers** | CustomersService | Customer CRUD |
| **dynamic-pricing** | DynamicPricingService, PricingRulesService | Demand/urgency/loyalty pricing |
| **email** | EmailService | Resend transactional email |
| **health** | HealthController | Database + Redis health checks |
| **invoices** | InvoicesService, InvoicePdfService, InvoiceOverdueService | Invoice CRUD, PDF generation, overdue tracking |
| **jobs** | JobsService | Job lifecycle (NOT_STARTED -> COMPLETED) |
| **messaging** | ConversationService, WhatsappService, QuickReplyService | Multi-channel messaging |
| **noshow-prevention** | NoshowPreventionService, WaitlistService, ReminderSchedulerService + Processor | No-show tracking, waitlist, appointment reminders (BullMQ) |
| **notifications** | NotificationsService + Processor + Event handlers | Event-driven SMS/email notifications (BullMQ) |
| **nps** | NpsService + Processor | NPS surveys, scoring, review gating (BullMQ) |
| **outbound-campaigns** | OutboundCampaignsService + Processor | Voice campaign orchestration (BullMQ) |
| **payment-reminders** | PaymentReminderService + Processor + Handler | Invoice payment reminder sequences (BullMQ) |
| **payments** | PaymentsService, DepositPaymentService | Stripe payment processing + deposits |
| **photo-quotes** | PhotoQuotesService + Processor | AI image-to-quote via Claude Vision (BullMQ) |
| **predictive-maintenance** | PredictionService, EquipmentService, AlertService | Equipment maintenance prediction |
| **public-booking** | PublicBookingService | Customer-facing booking (no auth) |
| **quotes** | QuotesService, QuoteFollowupService + Processor, PdfService | Quote CRUD, follow-up sequences, PDF (BullMQ) |
| **reports** | ReportsService | Business analytics/reports |
| **review-requests** | ReviewRequestsService, SmartReviewService + Processor + EventHandler, ReputationAnalyticsService | NPS-gated reviews, reputation dashboard (BullMQ) |
| **services** | ServicesService | Service catalog CRUD |
| **settings** | SettingsService | Tenant configuration |
| **sms** | SmsService | Twilio SMS send + inbound webhooks |
| **team** | TeamService | Team member management + invites |
| **tenants** | TenantsService | Tenant CRUD |
| **voice** | VoiceService | Vapi.ai voice assistant integration |

## BullMQ Queues

| Queue | Module | Purpose |
|-------|--------|---------|
| `calendar` | calendar | Google Calendar sync |
| `notifications` | notifications | Event-driven notifications |
| `nps-surveys` | nps | NPS survey distribution |
| `outbound-campaigns` | outbound-campaigns | Voice campaign orchestration |
| `payment-reminders` | payment-reminders | Invoice payment reminder sequences |
| `photo-quotes` | photo-quotes | AI image-to-quote processing |
| `quote-followup` | quotes | Quote follow-up automation |
| `review-pipeline` | review-requests | NPS-gated review request pipeline |
| `appointment-reminders` | noshow-prevention | Appointment reminder scheduling |

Queue config: Redis backend, 3 attempts, exponential backoff (2s), auto-remove completed (100 max), retain failed (500 max). Configured in `apps/api/src/config/queue/queue.module.ts`.

## Event System

Events defined in `apps/api/src/config/events/events.types.ts`. Emitted via `EventsService.emit()`, handled with `@OnEvent()` decorators.

**Event catalog:**
- `APPOINTMENT_CREATED`, `APPOINTMENT_UPDATED`, `APPOINTMENT_CONFIRMED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_REMINDER_DUE`
- `JOB_CREATED`, `JOB_STARTED`, `JOB_COMPLETED`, `JOB_CANCELLED`
- `PAYMENT_RECEIVED`, `PAYMENT_FAILED`, `INVOICE_SENT`, `INVOICE_OVERDUE`
- `QUOTE_CREATED`, `QUOTE_SENT`, `QUOTE_ACCEPTED`, `QUOTE_REJECTED`
- `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`
- `REVIEW_REQUEST_SENT`, `REVIEW_RECEIVED`
- `NPS_SURVEY_SENT`, `NPS_SCORE_SUBMITTED`, `NPS_LOW_SCORE_ALERT`, `NPS_REVIEW_CLICKED`

**Typed payloads:** `AppointmentEventPayload`, `JobEventPayload`, `PaymentEventPayload`, `QuoteEventPayload`, `CustomerEventPayload`, `ReviewEventPayload`, `NpsEventPayload` (all extend `BaseEventPayload` with `tenantId`, `timestamp`, `correlationId`).

## Multi-Tenant Architecture
- All tables include `tenantId` column with database indexes
- PostgreSQL Row-Level Security (RLS) optional via `FEATURE_RLS_ENABLED` env var
- `TenantContextMiddleware` extracts tenantId from authenticated user (applied globally)
- `TenantContextInterceptor` injects tenantId into request context (APP_INTERCEPTOR)
- All database queries filtered by tenantId via Prisma
- `RequestWithTenant` interface for type-safe tenant access
- Clerk auth provides tenantId from organization context

## Guards, Decorators & Middleware

### Guards
- **ClerkAuthGuard** (`common/guards/clerk-auth.guard.ts`) - Validates Clerk JWT tokens, used as APP_GUARD, respects `@Public()`
- **CustomerPortalGuard** (`modules/customer-portal/`) - Customer portal token validation
- **TenantThrottlerGuard** (`config/throttle/`) - Redis-backed per-tenant rate limiting

### Decorators
- **@Public()** (`common/decorators/public.decorator.ts`) - Skip auth for endpoint
- **@CurrentUser()** (`common/decorators/current-user.decorator.ts`) - Inject user context (returns `CurrentUserPayload` with `tenantId`, `userId`, `role`)

### Interceptors
- **TenantContextInterceptor** (`common/interceptors/tenant-context.interceptor.ts`) - Extract & inject tenantId
- **LoggingInterceptor** (`common/interceptors/logging.interceptor.ts`) - Request/response logging

### Filters
- **HttpExceptionFilter** (`common/filters/http-exception.filter.ts`) - Global error handling

### Other
- **CircuitBreakerService** (`common/circuit-breaker/`) - Opossum-based circuit breaker for external services
- **DecimalUtils** (`common/utils/decimal.ts`) - Decimal.js helpers for financial calculations

## API Bootstrap (main.ts)
- Helmet.js security headers (CSP, HSTS, COEP)
- CORS with env-based origin whitelist (default: localhost:3000, localhost:3001)
- Global ValidationPipe (whitelist, transform, forbid non-whitelisted)
- Static file serving for `/uploads`
- API prefix: `/api/v1`
- Listens on `0.0.0.0:3001`

## Config Modules (apps/api/src/config/)

| Module | Purpose |
|--------|---------|
| `prisma/` | Prisma ORM with multi-tenant support |
| `events/` | NestJS event emitter + typed event definitions |
| `queue/` | BullMQ global configuration (Redis connection, job defaults) |
| `cache/` | cache-manager with Redis backend |
| `clerk/` | Clerk SDK integration (@clerk/backend) |
| `storage/` | S3 or local filesystem abstraction |
| `throttle/` | Redis-backed rate limiting with tenant-aware guard |

## Testing

### Unit Tests (Jest)
Located in same directory as source files with `.spec.ts` extension.

**Test mock pattern:** Use `createMockPrismaService()` from `src/test/prisma-mock.ts` which creates typed mocks for all Prisma models with `jest.fn()` for each operation (findMany, findFirst, findUnique, create, update, delete, deleteMany, count, aggregate, upsert, updateMany, groupBy).

**Module setup pattern:**
```typescript
const module = await Test.createTestingModule({
  providers: [
    ServiceUnderTest,
    { provide: PrismaService, useValue: prisma },
    { provide: OtherService, useValue: mockOtherService },
  ],
}).compile();
```

**Current test suites:**
- `app.controller.spec.ts`
- `customers.service.spec.ts`
- `appointments.service.spec.ts`
- `quotes.service.spec.ts`
- `invoices.service.spec.ts`
- `noshow-prevention.service.spec.ts`
- `waitlist.service.spec.ts`
- `reminder-scheduler.service.spec.ts`
- `smart-review.service.spec.ts`
- `reputation-analytics.service.spec.ts`

### E2E Tests (Playwright)
19 test files in `/e2e/` covering: auth, appointments, availability, booking, calendar, dashboard, invoices, jobs, onboarding, quotes, settings, sms, team, voice, UI interactions.

### Jest Configuration (apps/api/jest.config.js)
- Test regex: `.*\.spec\.ts$`
- Transform: ts-jest with isolatedModules
- Module name mapping for `uuid` mock
- Root dir: `src/`

## Key Prisma Models (50+)

### Core Business
- **Tenant** - Multi-tenancy root
- **User** (roles: OWNER, ADMIN, DISPATCHER, TECHNICIAN)
- **TeamInvitation** (PENDING, ACCEPTED, EXPIRED, CANCELLED)
- **Customer** (includes `noShowCount`)
- **Service** + **ServiceAvailability**
- **Appointment** (SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
- **Job** (NOT_STARTED, EN_ROUTE, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED)
- **JobPhoto** (BEFORE, DURING, AFTER)
- **Quote** + **QuoteItem** (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED)
- **QuoteFollowUp** (follow-up sequence tracking)
- **Invoice** + **InvoiceItem** (deposit + late fee tracking)

### Scheduling & Dispatch
- **TechnicianAvailability** + **TimeOff**
- **CalendarIntegration** (Google Calendar sync)
- **CustomerPreference** (learned scheduling preferences)
- **TechnicianLocation** (real-time GPS)
- **CustomerLocation** (geocoded addresses)
- **OptimizedRoute**

### Communication
- **MessageChannel**, **ConversationThread**, **Message**
- **WhatsAppTemplate**, **QuickReply**
- **SmsBroadcast** + **SmsBroadcastRecipient**
- **CallLog** (Vapi call tracking)

### Automation & Prevention
- **AppointmentReminder** (scheduled reminders with status)
- **Waitlist** (WAITING, OFFERED, BOOKED, EXPIRED)
- **PaymentReminder** (payment sequence steps)
- **ReviewRequest** (PENDING, SENT, CLICKED, SKIPPED; includes `npsGated`, `npsScore`)
- **NpsSurvey** (NPS tracking with review gating)
- **OutboundCampaign** + **OutboundCall**

### AI & Advanced
- **CustomerContext** (AI personalization)
- **PhotoQuoteRequest** (AI image analysis)
- **CustomerEquipment**, **EquipmentServiceHistory**, **MaintenanceAlert**
- **DemandMetrics**, **PricingRule**, **ServicePricing**, **PriceQuoteHistory**
- **CustomerAuth** + **CustomerSession** (portal auth)

### Settings
- **TenantSettings** (business hours, reminders, review settings, late fees, deposits, `googleReviewUrl`, `yelpReviewUrl`, `facebookReviewUrl`, `reviewTimingHours`, `reviewMaxPerDay`)

## Environment Variables (apps/api/.env.example)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
VAPI_API_KEY=
VAPI_PHONE_NUMBER=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FEATURE_RLS_ENABLED=false
REDIS_URL=
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=
STORAGE_PROVIDER=local       # "s3" or "local"
STORAGE_LOCAL_PATH=./uploads
API_BASE_URL=http://localhost:3001
AWS_REGION=us-east-1
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

## External Services

| Service | Provider | Module | Purpose |
|---------|----------|--------|---------|
| Auth | Clerk | auth, customer-portal | User & org management |
| Voice AI | Vapi.ai | voice | AI phone call handling |
| SMS | Twilio | sms, notifications, noshow-prevention | Text messaging + inbound webhooks |
| Payments | Stripe | payments | Checkout, deposits, payment intents |
| Email | Resend | email, notifications | Transactional email |
| Calendar | Google Calendar API | calendar | Appointment sync |
| Storage | AWS S3 / Local | storage, jobs | Photos, documents |
| Image AI | Anthropic Claude | photo-quotes | Photo-based quote generation |
| Messaging | WhatsApp Business API | messaging | Rich messaging |
| Caching | Redis | cache | Performance optimization |
| Queues | Redis + BullMQ | queue | Async job processing |

## Implementation Plan

Active sprint plan at: `~/.claude/plans/polymorphic-dreaming-nebula.md`

**Sprint progress:**
- 7.0 AI Engine Foundation - not started
- 7.1 Quote Follow-Up Pipeline - complete (automation base)
- 7.2 Payment Automation - complete (automation base)
- 7.3 No-Show Prevention - complete (automation base)
- 7.4 Smart Review Pipeline - complete (automation base)
- 7.5-7.8 - not started

Active sprint plan details at: `~/.claude/plans/jaunty-mixing-starlight.md`

## Architecture Patterns
1. **Multi-Tenant SaaS** - All data isolated by tenantId, enforced at middleware + query level
2. **Event-Driven** - NestJS EventEmitter + BullMQ processors for async work
3. **Service Layer** - Controllers delegate to services; services own business logic
4. **Guard-based Auth** - Clerk tokens validated via APP_GUARD, `@Public()` for opt-out
5. **DTO Validation** - class-validator decorators on all request DTOs
6. **Circuit Breaker** - Opossum for resilience against external service failures
7. **Queue-based Processing** - BullMQ with delayed jobs, retries, and dead-letter handling
8. **Repository Abstraction** - Prisma as the data access layer (no raw SQL except `$executeRaw`)
