# Sprint 7: AI-Powered Business Automation (Simplified)

> **Philosophy:** Build for plumbers, not for Google. Ship simple. Measure. Iterate.
>
> **Author:** Claude Opus 4.5 | **Date:** 2026-01-30
> **Status:** ✅ COMPLETE - All sprints 7.0-7.5 implemented and tested

---

## What We're Building

Five focused features that solve real problems for small service businesses:

| Sprint | Feature | Problem Solved |
|--------|---------|----------------|
| 7.0 | AI Engine Foundation | Central AI wrapper with cost tracking |
| 7.1 | Quote Follow-Up | 90% of quotes die without follow-up |
| 7.2 | Payment Reminders | 43% of SMBs have cash flow problems |
| 7.3 | No-Show Prevention | No-shows destroy schedules |
| 7.4 | Review Pipeline | More reviews = more revenue |
| 7.5 | AI Copilot | Business owners need quick answers |

**Total estimated effort:** 3-4 weeks
**New Prisma models:** 4
**External dependencies:** None new (uses existing Claude, Twilio, Stripe)

---

## What We Cut (And Why)

| Removed Feature | Reason |
|-----------------|--------|
| Multi-model cascade routing | Premature optimization - no data showing it's needed |
| Semantic caching with pgvector | Over-engineering - Redis exact-match is sufficient |
| Prompt A/B testing | Not enough volume for statistical significance |
| Cross-tenant benchmarking | Privacy nightmare, no customer demand |
| Weather-triggered marketing | Hypothetical problem, no customer request |
| Customer journey state machine | Simple rules suffice |
| Inventory intelligence | Different product category |
| AI training mode | Implicit feedback loop is sufficient |
| Competitor scraping | Violates Google ToS, legal liability |
| Predictive lead scoring | Unvalidated need |
| Natural language configuration | Security risk (prompt injection) |
| Payment plans/financing | Defer until customers ask |
| Voice calls in follow-ups | Defer - start with SMS/email |

---

## Sprint 7.0: AI Engine Foundation

**Goal:** Centralized AI service with cost tracking. One model. Simple caching.

### Files to Create

```
apps/api/src/modules/ai-engine/
├── ai-engine.module.ts
├── ai-engine.service.ts      # Central Claude wrapper
├── prompt-templates.ts       # All prompts in one place
├── ai-cost.service.ts        # Token/cost tracking
└── ai-feedback.service.ts    # Track accept/edit/reject
```

### Implementation

**AiEngineService** - Simple, direct Claude wrapper:

```typescript
@Injectable()
export class AiEngineService {
  private readonly client: Anthropic;
  private readonly cache: CacheService;

  constructor(
    private readonly costService: AiCostService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // One method. One model. Simple.
  async generate<T>(opts: {
    template: keyof typeof PROMPT_TEMPLATES;
    variables: Record<string, unknown>;
    tenantId: string;
    expectJson?: boolean;
  }): Promise<T> {
    const prompt = this.interpolateTemplate(opts.template, opts.variables);
    const cacheKey = this.buildCacheKey(opts.template, opts.variables);

    // Simple exact-match cache
    const cached = await this.cache.get<T>(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    const response = await this.circuitBreaker.fire('claude', async () => {
      return this.client.messages.create({
        model: 'claude-sonnet-4-20250514', // One model. That's it.
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
    });

    const result = opts.expectJson
      ? JSON.parse(response.content[0].text)
      : response.content[0].text;

    // Track costs
    await this.costService.record({
      tenantId: opts.tenantId,
      template: opts.template,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: Date.now() - startTime,
    });

    // Cache result (5 minute TTL)
    await this.cache.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }

  // Fallback when AI is down
  async generateWithFallback<T>(
    opts: Parameters<typeof this.generate>[0],
    fallback: T,
  ): Promise<T> {
    try {
      return await this.generate<T>(opts);
    } catch (error) {
      this.logger.warn(`AI generation failed, using fallback`, { error, template: opts.template });
      return fallback;
    }
  }
}
```

**Prompt Templates** - Simple object, not a database:

```typescript
// apps/api/src/modules/ai-engine/prompt-templates.ts
export const PROMPT_TEMPLATES = {
  // Quote follow-up
  'quote.generate-followup': `
    Write a brief, friendly follow-up message for a quote.

    Customer: {customerName}
    Service: {serviceName}
    Amount: ${amount}
    Days since quote: {daysSinceQuote}
    Step: {step} of 4

    Requirements:
    - Under 160 characters (SMS-friendly)
    - Friendly but professional
    - Include a clear call to action
    - Step 1-2: Check-in tone
    - Step 3-4: Gentle urgency

    Return only the message text, no quotes or explanation.
  `,

  // No-show risk scoring
  'noshow.score-risk': `
    Score the no-show risk for this appointment.

    Customer history:
    - Previous no-shows: {noShowCount}
    - Total appointments: {totalAppointments}
    - Confirmation rate: {confirmationRate}%

    Appointment details:
    - Day: {dayOfWeek}
    - Time: {timeOfDay}
    - Booked {daysInAdvance} days ago
    - New customer: {isNewCustomer}

    Return JSON: { "risk": "low" | "medium" | "high", "score": 0-100, "reason": "brief explanation" }
  `,

  // Review request
  'review.generate-request': `
    Write a personalized review request.

    Customer: {customerName}
    Service: {serviceName}
    Technician: {technicianName}
    NPS Score: {npsScore}
    Business: {businessName}

    Requirements:
    - Under 160 characters
    - Thank them specifically
    - Mention the technician by name
    - Include review link placeholder: {reviewLink}

    Return only the message text.
  `,

  // Copilot query
  'copilot.answer-question': `
    You are a helpful business assistant for {businessName}, a {businessType} company.

    Answer this question using the provided data:
    Question: {question}

    Data:
    {data}

    Guidelines:
    - Be concise but complete
    - Use specific numbers from the data
    - If you can't answer from the data, say so
    - Suggest actionable next steps when relevant
  `,
} as const;
```

### Database Schema

```prisma
// Only 2 models for AI Engine
model AiUsage {
  id           String   @id @default(uuid())
  tenantId     String
  template     String
  inputTokens  Int
  outputTokens Int
  costCents    Int
  latencyMs    Int
  createdAt    DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([template])
}

model AiFeedback {
  id        String   @id @default(uuid())
  tenantId  String
  template  String
  aiOutput  String   @db.Text
  action    String   // ACCEPTED, EDITED, REJECTED
  humanEdit String?  @db.Text
  createdAt DateTime @default(now())

  @@index([tenantId, template])
}
```

### Cost Tracking

```typescript
@Injectable()
export class AiCostService {
  // Claude Sonnet pricing (as of 2026)
  private readonly COST_PER_1K_INPUT = 0.003;  // $3/1M
  private readonly COST_PER_1K_OUTPUT = 0.015; // $15/1M

  async record(usage: AiUsageInput): Promise<void> {
    const costCents = Math.ceil(
      (usage.inputTokens / 1000) * this.COST_PER_1K_INPUT * 100 +
      (usage.outputTokens / 1000) * this.COST_PER_1K_OUTPUT * 100
    );

    await this.prisma.aiUsage.create({
      data: { ...usage, costCents },
    });
  }

  async getMonthlySpend(tenantId: string): Promise<number> {
    const result = await this.prisma.aiUsage.aggregate({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth(new Date()) },
      },
      _sum: { costCents: true },
    });
    return (result._sum.costCents ?? 0) / 100;
  }
}
```

---

## Sprint 7.1: Quote Follow-Up Pipeline

**Goal:** Automated 4-step follow-up sequence. Simple. Effective.

### Existing Infrastructure to Use
- `QuotesService` - already exists
- `SmsService` - already exists
- `EmailService` - already exists
- BullMQ - already configured

### Files to Create/Modify

```
apps/api/src/modules/quotes/
├── quote-followup.service.ts   # NEW: Orchestrates follow-up sequence
├── quote-followup.processor.ts # NEW: BullMQ job processor
└── quotes.service.ts           # MODIFY: Emit events on quote actions
```

### Database Schema

```prisma
model QuoteFollowUp {
  id          String    @id @default(uuid())
  tenantId    String
  quoteId     String
  quote       Quote     @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  step        Int       // 1-4
  channel     String    // SMS or EMAIL
  scheduledAt DateTime
  sentAt      DateTime?
  status      QuoteFollowUpStatus @default(PENDING)
  messageText String?   @db.Text
  createdAt   DateTime  @default(now())

  @@index([tenantId])
  @@index([quoteId])
  @@index([status, scheduledAt])
}

enum QuoteFollowUpStatus {
  PENDING
  SENT
  CANCELLED
}
```

### Implementation

```typescript
@Injectable()
export class QuoteFollowupService {
  constructor(
    @InjectQueue('quote-followup') private queue: Queue,
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
  ) {}

  // Schedule 4-step sequence when quote is sent
  async scheduleFollowUps(quoteId: string): Promise<void> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { customer: true, service: true },
    });

    if (!quote) return;

    const steps = [
      { step: 1, delay: 1 * 24 * 60 * 60 * 1000, channel: 'SMS' },   // Day 1
      { step: 2, delay: 3 * 24 * 60 * 60 * 1000, channel: 'EMAIL' }, // Day 3
      { step: 3, delay: 7 * 24 * 60 * 60 * 1000, channel: 'SMS' },   // Day 7
      { step: 4, delay: 14 * 24 * 60 * 60 * 1000, channel: 'EMAIL' }, // Day 14
    ];

    for (const { step, delay, channel } of steps) {
      const scheduledAt = new Date(Date.now() + delay);

      const followUp = await this.prisma.quoteFollowUp.create({
        data: {
          tenantId: quote.tenantId,
          quoteId,
          step,
          channel,
          scheduledAt,
          status: 'PENDING',
        },
      });

      await this.queue.add(
        'send-followup',
        { followUpId: followUp.id },
        { delay },
      );
    }
  }

  // Cancel remaining follow-ups when quote is accepted/rejected
  async cancelFollowUps(quoteId: string): Promise<void> {
    await this.prisma.quoteFollowUp.updateMany({
      where: { quoteId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // Remove pending jobs from queue
    const jobs = await this.queue.getJobs(['delayed']);
    for (const job of jobs) {
      const followUp = await this.prisma.quoteFollowUp.findUnique({
        where: { id: job.data.followUpId },
      });
      if (followUp?.quoteId === quoteId) {
        await job.remove();
      }
    }
  }

  // Generate personalized message using AI
  async generateMessage(followUp: QuoteFollowUp, quote: Quote): Promise<string> {
    const daysSinceQuote = Math.floor(
      (Date.now() - quote.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    return this.aiEngine.generateWithFallback(
      {
        template: 'quote.generate-followup',
        variables: {
          customerName: quote.customer.name,
          serviceName: quote.service.name,
          amount: quote.total,
          daysSinceQuote,
          step: followUp.step,
        },
        tenantId: quote.tenantId,
      },
      // Fallback template if AI fails
      `Hi ${quote.customer.name}, just following up on your ${quote.service.name} quote. Any questions? Reply or call us anytime.`,
    );
  }
}
```

```typescript
@Processor('quote-followup')
export class QuoteFollowupProcessor extends WorkerHost {
  async process(job: Job<{ followUpId: string }>): Promise<void> {
    const followUp = await this.prisma.quoteFollowUp.findUnique({
      where: { id: job.data.followUpId },
      include: { quote: { include: { customer: true, service: true } } },
    });

    if (!followUp || followUp.status !== 'PENDING') return;

    // Check if quote is still in SENT status
    if (followUp.quote.status !== 'SENT') {
      await this.prisma.quoteFollowUp.update({
        where: { id: followUp.id },
        data: { status: 'CANCELLED' },
      });
      return;
    }

    // Generate and send message
    const message = await this.followupService.generateMessage(followUp, followUp.quote);

    if (followUp.channel === 'SMS') {
      await this.smsService.send(
        followUp.quote.customer.phone,
        message,
        followUp.tenantId,
      );
    } else {
      await this.emailService.send({
        to: followUp.quote.customer.email,
        subject: `Following up on your ${followUp.quote.service.name} quote`,
        body: message,
        tenantId: followUp.tenantId,
      });
    }

    await this.prisma.quoteFollowUp.update({
      where: { id: followUp.id },
      data: { status: 'SENT', sentAt: new Date(), messageText: message },
    });
  }
}
```

### Test Plan
- Create quote, send it → verify 4 jobs scheduled
- Accept quote mid-sequence → verify remaining jobs cancelled
- Verify AI message generation with fallback
- Check analytics: sent/cancelled counts per tenant

---

## Sprint 7.2: Payment Reminders

**Goal:** Simple escalating reminder sequence for unpaid invoices.

### Database Schema

```prisma
model PaymentReminder {
  id          String   @id @default(uuid())
  tenantId    String
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  step        Int      // 1-5
  channel     String   // SMS or EMAIL
  scheduledAt DateTime
  sentAt      DateTime?
  status      String   @default("PENDING") // PENDING, SENT, CANCELLED
  createdAt   DateTime @default(now())

  @@index([tenantId])
  @@index([invoiceId])
  @@index([status, scheduledAt])
}
```

### Reminder Sequence

| Step | Timing | Channel | Tone |
|------|--------|---------|------|
| 1 | Due - 3 days | SMS | Friendly reminder |
| 2 | Due date | Email | Due today |
| 3 | Due + 3 days | SMS | Overdue notice |
| 4 | Due + 7 days | Email | Urgent |
| 5 | Due + 14 days | SMS + Email | Final notice |

### Implementation

Pattern mirrors Quote Follow-Up:
- `PaymentReminderService` - schedules sequence on invoice creation
- `PaymentReminderProcessor` - sends reminders via BullMQ
- Cancel sequence when invoice paid

**No AI needed** - Use simple templates. Payment reminders should be predictable.

```typescript
const REMINDER_TEMPLATES = {
  1: 'Hi {name}, friendly reminder: Invoice #{number} for ${amount} is due in 3 days. Pay here: {link}',
  2: 'Invoice #{number} for ${amount} is due today. Avoid late fees - pay now: {link}',
  3: 'Your invoice #{number} is now {days} days overdue. Please pay ${amount} at: {link}',
  4: 'URGENT: Invoice #{number} (${amount}) is {days} days past due. Pay now to avoid collections: {link}',
  5: 'FINAL NOTICE: Invoice #{number} must be paid immediately to avoid further action. Amount: ${amount}. Pay: {link}',
};
```

---

## Sprint 7.3: No-Show Prevention

**Goal:** Confirmation reminders + basic waitlist + risk flagging.

### Database Changes

```prisma
// Add to existing Appointment model
model Appointment {
  // ... existing fields ...
  confirmedAt DateTime?
  riskScore   Int?      // 0-100, populated by AI

  @@index([status, startTime]) // For finding unconfirmed appointments
}

// Add to existing Customer model
model Customer {
  // ... existing fields ...
  noShowCount Int @default(0)
}

// New waitlist model
model Waitlist {
  id            String    @id @default(uuid())
  tenantId      String
  customerId    String
  customer      Customer  @relation(fields: [customerId], references: [id])
  serviceId     String
  service       Service   @relation(fields: [serviceId], references: [id])
  preferredDate DateTime
  status        WaitlistStatus @default(WAITING)
  notifiedAt    DateTime?
  bookedAt      DateTime?
  createdAt     DateTime  @default(now())

  @@index([tenantId, serviceId, status])
}

enum WaitlistStatus {
  WAITING
  OFFERED
  BOOKED
  EXPIRED
}
```

### Reminder Schedule

Enhance existing reminder crons:
- **48h before:** Email with appointment details + reschedule link
- **24h before:** SMS with confirmation request ("Reply C to confirm")
- **2h before:** SMS reminder ("Tech on the way")

### Confirmation Flow

```typescript
// Handle inbound SMS
@Injectable()
export class SmsWebhookHandler {
  async handleInbound(from: string, body: string): Promise<void> {
    const normalizedBody = body.trim().toUpperCase();

    // Find appointment for this phone number in next 48 hours
    const appointment = await this.findUpcomingAppointment(from);
    if (!appointment) return;

    if (['C', 'CONFIRM', 'YES', 'Y'].includes(normalizedBody)) {
      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { confirmedAt: new Date() },
      });
      await this.smsService.send(from, 'Confirmed! See you soon.');
    } else if (['R', 'RESCHEDULE', 'CANCEL'].includes(normalizedBody)) {
      const rescheduleLink = this.buildRescheduleLink(appointment.id);
      await this.smsService.send(from, `Reschedule here: ${rescheduleLink}`);
    }
  }
}
```

### Risk Scoring (Simple)

```typescript
@Injectable()
export class NoshowRiskService {
  async scoreAppointment(appointmentId: string): Promise<number> {
    const apt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true },
    });

    // Simple rule-based scoring (no AI needed for MVP)
    let score = 20; // Base score

    // Customer history
    if (apt.customer.noShowCount > 0) score += 25;
    if (apt.customer.noShowCount > 2) score += 25;

    // Booking lead time
    const daysInAdvance = differenceInDays(apt.startTime, apt.createdAt);
    if (daysInAdvance > 14) score += 10; // Booked far in advance
    if (daysInAdvance < 1) score -= 10;  // Same-day is usually committed

    // Time of day
    const hour = apt.startTime.getHours();
    if (hour < 9 || hour > 17) score += 10; // Off-hours

    return Math.min(100, Math.max(0, score));
  }

  // Alert dispatcher for high-risk appointments not confirmed
  @Cron('0 * * * *') // Every hour
  async alertUnconfirmedHighRisk(): Promise<void> {
    const threshold = 6; // hours before appointment
    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: {
          gte: new Date(),
          lte: addHours(new Date(), threshold),
        },
        confirmedAt: null,
        riskScore: { gte: 50 },
        status: 'SCHEDULED',
      },
    });

    for (const apt of appointments) {
      await this.notifyDispatcher(apt, 'High-risk appointment not confirmed');
    }
  }
}
```

### Waitlist (Simple)

```typescript
@Injectable()
export class WaitlistService {
  async addToWaitlist(dto: AddToWaitlistDto): Promise<Waitlist> {
    return this.prisma.waitlist.create({ data: dto });
  }

  // On cancellation, notify first matching waitlist entry
  async notifyWaitlistForSlot(
    tenantId: string,
    serviceId: string,
    date: Date,
  ): Promise<void> {
    const match = await this.prisma.waitlist.findFirst({
      where: {
        tenantId,
        serviceId,
        status: 'WAITING',
        preferredDate: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
      orderBy: { createdAt: 'asc' },
      include: { customer: true },
    });

    if (match) {
      await this.smsService.send(
        match.customer.phone,
        `Good news! A slot opened up on ${format(date, 'MMM d')}. Reply YES to book.`,
      );

      await this.prisma.waitlist.update({
        where: { id: match.id },
        data: { status: 'OFFERED', notifiedAt: new Date() },
      });
    }
  }
}
```

---

## Sprint 7.4: Review Pipeline

**Goal:** NPS-gated review requests. Only ask happy customers for reviews.

### Flow

1. Job completed → Send NPS survey (1-10 scale)
2. NPS 9-10 (Promoter) → Send review request with Google link
3. NPS 7-8 (Passive) → Send "how can we improve?" email
4. NPS 0-6 (Detractor) → Alert owner, NO review request

### Database Schema

Uses existing `NpsSurvey` and `ReviewRequest` models. Add:

```prisma
model ReviewRequest {
  // ... existing fields ...
  npsScore   Int?
  platform   String  @default("GOOGLE") // GOOGLE, YELP, FACEBOOK
}
```

### Implementation

```typescript
@Injectable()
export class SmartReviewService {
  @OnEvent(EVENTS.NPS_SCORE_SUBMITTED)
  async handleNpsScore(payload: NpsEventPayload): Promise<void> {
    const { customerId, score, jobId, tenantId } = payload;

    if (score >= 9) {
      // Promoter - schedule review request
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const delay = (tenant.settings.reviewTimingHours ?? 3) * 60 * 60 * 1000;

      await this.reviewQueue.add(
        'send-review-request',
        { customerId, jobId, tenantId, npsScore: score },
        { delay },
      );
    } else if (score >= 7) {
      // Passive - ask for feedback
      await this.sendFeedbackRequest(customerId, tenantId);
    } else {
      // Detractor - alert owner
      await this.alertOwner(tenantId, customerId, score);
    }
  }

  async generateReviewRequest(
    customer: Customer,
    job: Job,
    tenant: Tenant,
  ): Promise<string> {
    return this.aiEngine.generateWithFallback(
      {
        template: 'review.generate-request',
        variables: {
          customerName: customer.name,
          serviceName: job.service.name,
          technicianName: job.technician?.name ?? 'our team',
          npsScore: 9,
          businessName: tenant.businessName,
          reviewLink: tenant.settings.googleReviewUrl,
        },
        tenantId: tenant.id,
      },
      // Fallback
      `Thanks for choosing ${tenant.businessName}! If you have a moment, we'd love a Google review: ${tenant.settings.googleReviewUrl}`,
    );
  }
}
```

---

## Sprint 7.5: AI Copilot (Read-Only)

**Goal:** Natural language queries over business data. No write capabilities.

### Architecture

- **SSE streaming** for chat responses (users expect this in chat UIs)
- **Tool use** for database queries
- **Read-only** - no configuration changes via chat

### Files to Create

```
apps/api/src/modules/ai-copilot/
├── ai-copilot.module.ts
├── ai-copilot.service.ts      # Query orchestration
├── ai-copilot.controller.ts   # REST + SSE endpoints
├── copilot-tools.service.ts   # Database query functions
└── copilot-tools.ts           # Tool definitions
```

### Tool Definitions

```typescript
export const COPILOT_TOOLS = [
  {
    name: 'get_revenue_summary',
    description: 'Get revenue totals for a date range',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        groupBy: { type: 'string', enum: ['day', 'week', 'month'] },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_appointment_stats',
    description: 'Get appointment counts, completion rates, no-show rates',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        technicianId: { type: 'string' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_quote_pipeline',
    description: 'Get quote conversion funnel metrics',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_customer_list',
    description: 'Get customers filtered by criteria',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'dormant', 'at_risk'] },
        sortBy: { type: 'string', enum: ['last_visit', 'total_spend', 'name'] },
        limit: { type: 'number', default: 10 },
      },
    },
  },
  {
    name: 'get_invoice_aging',
    description: 'Get outstanding invoices grouped by age',
    input_schema: { type: 'object', properties: {} },
  },
];
```

### SSE Streaming Controller

```typescript
@Controller('copilot')
export class AiCopilotController {
  @Get('stream')
  @Sse()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // Rate limit
  streamQuery(
    @Query('query') query: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const timeout = setTimeout(() => {
        subscriber.next({ data: { error: 'Request timed out' } });
        subscriber.complete();
      }, 60000);

      this.copilotService
        .streamResponse(query, user.tenantId, {
          onToken: (token) => subscriber.next({ data: { token } }),
          onToolCall: (tool, result) =>
            subscriber.next({ data: { tool, result } }),
          onComplete: (fullResponse) => {
            clearTimeout(timeout);
            subscriber.next({ data: { done: true, response: fullResponse } });
            subscriber.complete();
          },
          onError: (error) => {
            clearTimeout(timeout);
            subscriber.next({ data: { error: error.message } });
            subscriber.complete();
          },
        })
        .catch((error) => {
          clearTimeout(timeout);
          subscriber.next({ data: { error: error.message } });
          subscriber.complete();
        });
    });
  }
}
```

### Example Conversations

**"How did we do this week?"**
→ Calls `get_revenue_summary`, `get_appointment_stats`
→ "This week: $12,400 revenue (up 8%), 18 jobs completed, 1 no-show. Best day was Thursday."

**"Which customers haven't visited in 3 months?"**
→ Calls `get_customer_list` with status='dormant'
→ Returns list with last visit date and total spend

**"What invoices are overdue?"**
→ Calls `get_invoice_aging`
→ "You have $4,200 overdue: 3 invoices in 1-30 days ($2,800), 1 invoice 30+ days ($1,400)."

---

## Complete Database Schema

```prisma
// Sprint 7.0 - AI Engine
model AiUsage {
  id           String   @id @default(uuid())
  tenantId     String
  template     String
  inputTokens  Int
  outputTokens Int
  costCents    Int
  latencyMs    Int
  createdAt    DateTime @default(now())
  @@index([tenantId, createdAt])
}

model AiFeedback {
  id        String   @id @default(uuid())
  tenantId  String
  template  String
  aiOutput  String   @db.Text
  action    String
  humanEdit String?  @db.Text
  createdAt DateTime @default(now())
  @@index([tenantId, template])
}

// Sprint 7.1 - Quote Follow-Up
model QuoteFollowUp {
  id          String              @id @default(uuid())
  tenantId    String
  quoteId     String
  quote       Quote               @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  step        Int
  channel     String
  scheduledAt DateTime
  sentAt      DateTime?
  status      QuoteFollowUpStatus @default(PENDING)
  messageText String?             @db.Text
  createdAt   DateTime            @default(now())
  @@index([tenantId])
  @@index([quoteId])
  @@index([status, scheduledAt])
}

enum QuoteFollowUpStatus {
  PENDING
  SENT
  CANCELLED
}

// Sprint 7.2 - Payment Reminders
model PaymentReminder {
  id          String   @id @default(uuid())
  tenantId    String
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  step        Int
  channel     String
  scheduledAt DateTime
  sentAt      DateTime?
  status      String   @default("PENDING")
  createdAt   DateTime @default(now())
  @@index([tenantId])
  @@index([invoiceId])
  @@index([status, scheduledAt])
}

// Sprint 7.3 - Waitlist
model Waitlist {
  id            String         @id @default(uuid())
  tenantId      String
  customerId    String
  customer      Customer       @relation(fields: [customerId], references: [id])
  serviceId     String
  service       Service        @relation(fields: [serviceId], references: [id])
  preferredDate DateTime
  status        WaitlistStatus @default(WAITING)
  notifiedAt    DateTime?
  bookedAt      DateTime?
  createdAt     DateTime       @default(now())
  @@index([tenantId, serviceId, status])
}

enum WaitlistStatus {
  WAITING
  OFFERED
  BOOKED
  EXPIRED
}

// Add to existing models:
// Appointment: confirmedAt DateTime?, riskScore Int?
// Customer: noShowCount Int @default(0)
// ReviewRequest: npsScore Int?, platform String @default("GOOGLE")
```

---

## BullMQ Queues

| Queue | Purpose | Processor |
|-------|---------|-----------|
| `quote-followup` | 4-step quote follow-up sequence | QuoteFollowupProcessor |
| `payment-reminders` | 5-step payment reminder sequence | PaymentReminderProcessor |
| `review-pipeline` | NPS-gated review requests | ReviewPipelineProcessor |

---

## Testing Strategy

### Unit Tests (Jest)

Each service should have a `.spec.ts` file testing:
- Core business logic
- Edge cases (empty data, invalid input)
- Fallback behavior when AI fails

### Integration Tests

- BullMQ job scheduling and processing
- Event emission and handling
- Database transactions

### E2E Tests (Playwright)

Add to existing `/e2e/` directory:
- `quote-followup.spec.ts` - Test full quote → follow-up flow
- `payment-reminders.spec.ts` - Test invoice → reminder flow
- `copilot.spec.ts` - Test chat interface

---

## Implementation Order

1. **Week 1:** Sprint 7.0 (AI Engine) + Sprint 7.1 (Quote Follow-Up)
2. **Week 2:** Sprint 7.2 (Payment Reminders) + Sprint 7.3 (No-Show Prevention)
3. **Week 3:** Sprint 7.4 (Review Pipeline) + Sprint 7.5 (Copilot)
4. **Week 4:** Testing, bug fixes, polish

---

## Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Quote conversion rate | ~25% | 35% |
| Invoice collection time | 30+ days | <15 days |
| No-show rate | ~15% | <5% |
| Google reviews/month | 2-3 | 8-10 |
| Copilot usage | 0 | 10+ queries/day/tenant |

---

## What We Deferred (For Later Sprints)

- Multi-model routing (when AI costs become painful)
- Semantic caching (when cache hit rates are measured)
- Payment plans/financing (when customers ask)
- Voice calls in sequences (when SMS/email isn't enough)
- Cross-tenant benchmarks (when we have 50+ tenants)
- Weather marketing (when anyone asks for it)
- Inventory tracking (different product)

**Philosophy:** Ship simple. Measure. Add complexity only when the pain demands it.
