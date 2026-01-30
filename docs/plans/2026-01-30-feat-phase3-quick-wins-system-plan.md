# Phase 3: Quick Wins System

> **Philosophy:** Surface the right action at the right time. Make it one click.
>
> **Author:** Claude Opus 4.5 | **Date:** 2026-01-30
> **Status:** 🚧 IN PROGRESS

---

## Overview

The Quick Wins System helps small business owners identify and act on revenue opportunities without analysis paralysis. It surfaces AI-generated daily tasks, enables one-click actions, sends smart notifications, and provides revenue optimization tips.

**Core Principle:** Every suggestion must be actionable in under 30 seconds.

---

## What We're Building

| Feature | Problem Solved | User Value |
|---------|----------------|------------|
| Daily Task Suggestions | Business owners miss opportunities buried in data | "Here are 5 things to do today" |
| Dashboard Quick Actions | Too many clicks to take action | One-click execution |
| Smart Notifications | Alert fatigue from too many notifications | Only notify what matters |
| Revenue Optimization Tips | No time to analyze business performance | "Here's how to make more money" |

---

## Existing Infrastructure to Leverage

The codebase already has:
- ✅ `AIAction` model - Track suggested & executed actions
- ✅ `AgentInsight` model - Store AI-generated insights
- ✅ `ContextualSuggestion` model - Cache suggestions per page
- ✅ `ActionExecutorService` - Execute approved actions
- ✅ `AgentInsightsService` - Generate insights from specialist agents
- ✅ `AiSuggestionsService` - Context-based suggestions
- ✅ BullMQ queues - Async job processing
- ✅ Event system - Trigger suggestions on business events
- ✅ InsightsPanel component - Display suggestions in UI

**Key files to reference:**
- `apps/api/src/modules/ai-actions/action-executor.service.ts`
- `apps/api/src/modules/specialist-agents/agent-insights.service.ts`
- `apps/api/src/modules/ai-suggestions/ai-suggestions.service.ts`
- `apps/web/components/insights/insights-panel.tsx`

---

## Sprint 8.1: Daily Task Suggestions

**Goal:** Generate 3-5 actionable daily tasks based on business data.

### Database Schema

```prisma
model DailyTask {
  id            String    @id @default(uuid())
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  title         String
  description   String
  category      DailyTaskCategory
  priority      Int       @default(50) // 0-100
  estimatedMins Int       @default(5)
  actionType    String?   // Maps to ActionType enum
  actionParams  Json?     // Params for one-click execution
  entityType    String?   // QUOTE, INVOICE, CUSTOMER, APPOINTMENT
  entityId      String?   // Reference to the entity
  suggestedAt   DateTime  @default(now())
  completedAt   DateTime?
  skippedAt     DateTime?
  expiredAt     DateTime? // Auto-expire after 24h
  status        DailyTaskStatus @default(SUGGESTED)
  createdAt     DateTime  @default(now())

  @@index([tenantId, status, suggestedAt])
  @@index([tenantId, category])
}

enum DailyTaskCategory {
  REVENUE        // Follow up quotes, collect payments
  CUSTOMER       // Re-engage dormant, respond to feedback
  OPERATIONS     // Confirm appointments, prevent no-shows
  GROWTH         // Request reviews, referral outreach
}

enum DailyTaskStatus {
  SUGGESTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
  EXPIRED
}
```

### Files to Create

```
apps/api/src/modules/daily-tasks/
├── daily-tasks.module.ts
├── daily-tasks.service.ts       # CRUD + task generation orchestration
├── daily-tasks.controller.ts    # REST endpoints
├── daily-tasks.generator.ts     # Core task generation logic
├── daily-tasks.processor.ts     # BullMQ processor for nightly generation
└── dto/
    ├── daily-task.dto.ts
    └── update-task-status.dto.ts
```

### Task Generation Rules

```typescript
// apps/api/src/modules/daily-tasks/daily-tasks.generator.ts

interface TaskRule {
  category: DailyTaskCategory;
  title: string;
  query: () => Promise<any[]>;
  buildTask: (entity: any) => Partial<DailyTask>;
  maxPerDay: number;
  priority: number;
}

const TASK_RULES: TaskRule[] = [
  // REVENUE: Aging quotes (high priority)
  {
    category: 'REVENUE',
    title: 'Follow up on aging quote',
    query: async () => prisma.quote.findMany({
      where: {
        status: 'SENT',
        sentAt: { lt: subDays(new Date(), 3) },
        followUps: { none: { status: 'SENT', sentAt: { gt: subDays(new Date(), 2) } } },
      },
      take: 3,
      orderBy: { amount: 'desc' },
    }),
    buildTask: (quote) => ({
      description: `${quote.customer.name} - $${quote.amount} quote sent ${formatDistanceToNow(quote.sentAt)} ago`,
      actionType: 'SEND_FOLLOWUP',
      actionParams: { quoteId: quote.id },
      entityType: 'QUOTE',
      entityId: quote.id,
      estimatedMins: 2,
    }),
    maxPerDay: 3,
    priority: 90,
  },

  // REVENUE: Overdue invoices
  {
    category: 'REVENUE',
    title: 'Collect overdue payment',
    query: async () => prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'OVERDUE'] },
        dueDate: { lt: new Date() },
      },
      take: 3,
      orderBy: { amount: 'desc' },
    }),
    buildTask: (invoice) => ({
      description: `${invoice.customer.name} - $${invoice.amount} overdue by ${formatDistanceToNow(invoice.dueDate)}`,
      actionType: 'SEND_PAYMENT_REMINDER',
      actionParams: { invoiceId: invoice.id },
      entityType: 'INVOICE',
      entityId: invoice.id,
      estimatedMins: 2,
    }),
    maxPerDay: 3,
    priority: 95,
  },

  // OPERATIONS: Unconfirmed appointments (tomorrow)
  {
    category: 'OPERATIONS',
    title: 'Confirm tomorrow\'s appointment',
    query: async () => prisma.appointment.findMany({
      where: {
        scheduledAt: {
          gte: startOfTomorrow(),
          lt: endOfTomorrow(),
        },
        confirmedAt: null,
        status: 'SCHEDULED',
      },
      include: { customer: true },
    }),
    buildTask: (apt) => ({
      description: `${apt.customer.name} at ${format(apt.scheduledAt, 'h:mm a')}`,
      actionType: 'SEND_CONFIRMATION_REQUEST',
      actionParams: { appointmentId: apt.id },
      entityType: 'APPOINTMENT',
      entityId: apt.id,
      estimatedMins: 1,
    }),
    maxPerDay: 5,
    priority: 85,
  },

  // CUSTOMER: Dormant customers (no visit in 90 days)
  {
    category: 'CUSTOMER',
    title: 'Re-engage dormant customer',
    query: async () => prisma.customer.findMany({
      where: {
        appointments: {
          some: { status: 'COMPLETED' },
          none: { completedAt: { gt: subDays(new Date(), 90) } },
        },
      },
      take: 2,
      orderBy: { appointments: { _count: 'desc' } },
    }),
    buildTask: (customer) => ({
      description: `${customer.name} - Last visit ${formatDistanceToNow(customer.lastVisit)} ago`,
      actionType: 'SEND_REENGAGEMENT',
      actionParams: { customerId: customer.id },
      entityType: 'CUSTOMER',
      entityId: customer.id,
      estimatedMins: 3,
    }),
    maxPerDay: 2,
    priority: 60,
  },

  // GROWTH: Request reviews from recent happy customers
  {
    category: 'GROWTH',
    title: 'Request a Google review',
    query: async () => prisma.npsSurvey.findMany({
      where: {
        score: { gte: 9 },
        submittedAt: { gt: subDays(new Date(), 7) },
        customer: {
          reviewRequests: { none: { status: 'SENT' } },
        },
      },
      include: { customer: true },
      take: 2,
    }),
    buildTask: (survey) => ({
      description: `${survey.customer.name} gave you a ${survey.score}/10`,
      actionType: 'SEND_REVIEW_REQUEST',
      actionParams: { customerId: survey.customerId },
      entityType: 'CUSTOMER',
      entityId: survey.customerId,
      estimatedMins: 1,
    }),
    maxPerDay: 2,
    priority: 70,
  },
];
```

### Nightly Generation Job

```typescript
// apps/api/src/modules/daily-tasks/daily-tasks.processor.ts
@Processor('daily-tasks')
export class DailyTasksProcessor extends WorkerHost {
  @Cron('0 5 * * *') // Run at 5 AM daily
  async generateDailyTasks(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const tenant of tenants) {
      await this.queue.add('generate-tasks', { tenantId: tenant.id });
    }
  }

  async process(job: Job<{ tenantId: string }>): Promise<void> {
    // Expire old tasks
    await this.prisma.dailyTask.updateMany({
      where: {
        tenantId: job.data.tenantId,
        status: 'SUGGESTED',
        suggestedAt: { lt: subDays(new Date(), 1) },
      },
      data: { status: 'EXPIRED', expiredAt: new Date() },
    });

    // Generate new tasks using rules
    await this.generator.generateForTenant(job.data.tenantId);
  }
}
```

### API Endpoints

```typescript
// apps/api/src/modules/daily-tasks/daily-tasks.controller.ts
@Controller('daily-tasks')
export class DailyTasksController {
  @Get()
  async getTodaysTasks(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getTodaysTasks(user.tenantId);
  }

  @Post(':id/complete')
  async completeTask(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.completeTask(id, user.tenantId);
  }

  @Post(':id/skip')
  async skipTask(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.skipTask(id, user.tenantId);
  }

  @Post(':id/execute')
  async executeTaskAction(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // One-click execution
    return this.service.executeAction(id, user.tenantId);
  }
}
```

### Frontend Component

```typescript
// apps/web/components/dashboard/daily-tasks.tsx
export function DailyTasks() {
  const { tasks, isLoading, completeTask, skipTask, executeAction } = useDailyTasks();

  if (isLoading) return <DailyTasksSkeleton />;
  if (!tasks.length) return <NoTasksMessage />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="sparkles" className="text-amber-500" />
          Today's Quick Wins
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {tasks.length} tasks • ~{totalMinutes} min
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <DailyTaskItem
            key={task.id}
            task={task}
            onComplete={() => completeTask(task.id)}
            onSkip={() => skipTask(task.id)}
            onExecute={() => executeAction(task.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function DailyTaskItem({ task, onComplete, onSkip, onExecute }) {
  const categoryIcons = {
    REVENUE: 'dollar-sign',
    CUSTOMER: 'users',
    OPERATIONS: 'calendar',
    GROWTH: 'trending-up',
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        categoryColors[task.category]
      )}>
        <Icon name={categoryIcons[task.category]} size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground truncate">{task.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{task.estimatedMins}m</span>
        {task.actionType && (
          <Button size="sm" variant="default" onClick={onExecute}>
            <Icon name="play" size={14} className="mr-1" />
            Do it
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onSkip}>
          <Icon name="x" size={14} />
        </Button>
      </div>
    </div>
  );
}
```

---

## Sprint 8.2: Dashboard Quick Actions

**Goal:** One-click execution for common actions.

### Quick Action Types

```typescript
// Low-risk actions that execute immediately (no approval needed)
const INSTANT_ACTIONS = [
  'SEND_CONFIRMATION_REQUEST',  // Send appointment confirmation SMS
  'SEND_FOLLOWUP',              // Send quote follow-up
  'SEND_PAYMENT_REMINDER',      // Send payment reminder
  'SEND_REVIEW_REQUEST',        // Send review request
  'MARK_TASK_COMPLETE',         // Mark daily task complete
];

// Medium-risk actions that show confirmation toast
const CONFIRM_ACTIONS = [
  'SEND_REENGAGEMENT',          // Re-engage dormant customer
  'APPLY_LATE_FEE',             // Apply late fee to invoice
  'RESCHEDULE_APPOINTMENT',     // Reschedule appointment
];

// High-risk actions that require modal confirmation
const MODAL_ACTIONS = [
  'CANCEL_APPOINTMENT',         // Cancel appointment
  'WRITE_OFF_INVOICE',          // Write off invoice
  'DELETE_CUSTOMER',            // Delete customer
];
```

### Files to Create/Modify

```
apps/api/src/modules/quick-actions/
├── quick-actions.module.ts
├── quick-actions.service.ts    # Orchestrates action execution
├── quick-actions.controller.ts # POST /quick-actions/:type
└── action-handlers/
    ├── send-confirmation.handler.ts
    ├── send-followup.handler.ts
    ├── send-payment-reminder.handler.ts
    └── send-review-request.handler.ts

apps/web/components/dashboard/
├── quick-action-button.tsx     # Reusable one-click button
└── quick-action-toast.tsx      # Success/error toast
```

### Implementation

```typescript
// apps/api/src/modules/quick-actions/quick-actions.service.ts
@Injectable()
export class QuickActionsService {
  async execute(
    actionType: string,
    params: Record<string, any>,
    tenantId: string,
  ): Promise<QuickActionResult> {
    const handler = this.handlers[actionType];
    if (!handler) throw new BadRequestException(`Unknown action: ${actionType}`);

    // Log action attempt
    const log = await this.prisma.quickActionLog.create({
      data: { tenantId, actionType, params, status: 'EXECUTING' },
    });

    try {
      const result = await handler.execute(params, tenantId);

      await this.prisma.quickActionLog.update({
        where: { id: log.id },
        data: { status: 'COMPLETED', result },
      });

      return { success: true, message: result.message };
    } catch (error) {
      await this.prisma.quickActionLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: error.message },
      });
      throw error;
    }
  }
}
```

```typescript
// apps/web/components/dashboard/quick-action-button.tsx
interface QuickActionButtonProps {
  actionType: string;
  params: Record<string, any>;
  label: string;
  icon?: IconName;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default';
  onSuccess?: () => void;
}

export function QuickActionButton({
  actionType,
  params,
  label,
  icon = 'play',
  variant = 'default',
  size = 'sm',
  onSuccess,
}: QuickActionButtonProps) {
  const { execute, isLoading } = useQuickAction();

  const handleClick = async () => {
    const result = await execute(actionType, params);
    if (result.success) {
      toast.success(result.message);
      onSuccess?.();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Icon name="loader-2" size={14} className="animate-spin mr-1" />
      ) : (
        <Icon name={icon} size={14} className="mr-1" />
      )}
      {label}
    </Button>
  );
}
```

---

## Sprint 8.3: Smart Notifications

**Goal:** Only notify about things that matter, when they matter.

### Database Schema

```prisma
model NotificationPreference {
  id                String   @id @default(uuid())
  tenantId          String
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  // Channels
  enableEmail       Boolean  @default(true)
  enableSms         Boolean  @default(false)
  enablePush        Boolean  @default(true)

  // Categories
  revenueAlerts     Boolean  @default(true)   // Payments, quotes
  operationsAlerts  Boolean  @default(true)   // Appointments, no-shows
  customerAlerts    Boolean  @default(true)   // Feedback, reviews

  // Thresholds
  minPaymentAmount  Int      @default(100)    // Only notify for payments > $100
  minQuoteAmount    Int      @default(500)    // Only notify for quotes > $500

  // Timing
  quietHoursStart   String?  @default("22:00") // Don't notify after 10 PM
  quietHoursEnd     String?  @default("07:00") // Don't notify before 7 AM
  batchNotifications Boolean @default(true)   // Batch low-priority into daily digest

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([tenantId, userId])
}

model SmartNotification {
  id          String    @id @default(uuid())
  tenantId    String
  userId      String
  category    NotificationCategory
  priority    NotificationPriority
  title       String
  body        String
  actionUrl   String?
  actionLabel String?
  entityType  String?
  entityId    String?
  channel     String    // EMAIL, SMS, PUSH, DIGEST
  scheduledAt DateTime?
  sentAt      DateTime?
  readAt      DateTime?
  status      String    @default("PENDING")
  createdAt   DateTime  @default(now())

  @@index([tenantId, userId, status])
  @@index([scheduledAt, status])
}

enum NotificationCategory {
  REVENUE
  OPERATIONS
  CUSTOMER
  SYSTEM
}

enum NotificationPriority {
  URGENT     // Send immediately, bypass quiet hours
  HIGH       // Send soon, respect quiet hours
  MEDIUM     // Can batch into digest
  LOW        // Only in digest
}
```

### Notification Rules

```typescript
// apps/api/src/modules/smart-notifications/notification-rules.ts
interface NotificationRule {
  event: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  condition?: (payload: any, prefs: NotificationPreference) => boolean;
  buildNotification: (payload: any) => Partial<SmartNotification>;
}

const NOTIFICATION_RULES: NotificationRule[] = [
  // URGENT: Large payment received
  {
    event: 'PAYMENT_RECEIVED',
    category: 'REVENUE',
    priority: 'URGENT',
    condition: (p, prefs) => p.amount >= prefs.minPaymentAmount,
    buildNotification: (p) => ({
      title: `Payment received: $${p.amount}`,
      body: `${p.customerName} paid invoice #${p.invoiceNumber}`,
      actionUrl: `/invoices/${p.invoiceId}`,
      actionLabel: 'View invoice',
    }),
  },

  // HIGH: Quote accepted
  {
    event: 'QUOTE_ACCEPTED',
    category: 'REVENUE',
    priority: 'HIGH',
    buildNotification: (p) => ({
      title: `Quote accepted: $${p.amount}`,
      body: `${p.customerName} accepted your quote`,
      actionUrl: `/quotes/${p.quoteId}`,
      actionLabel: 'Create invoice',
    }),
  },

  // HIGH: No-show alert
  {
    event: 'APPOINTMENT_NOSHOW',
    category: 'OPERATIONS',
    priority: 'HIGH',
    buildNotification: (p) => ({
      title: 'Customer no-show',
      body: `${p.customerName} missed their ${p.time} appointment`,
      actionUrl: `/appointments/${p.appointmentId}`,
      actionLabel: 'Reschedule',
    }),
  },

  // MEDIUM: Low NPS score
  {
    event: 'NPS_LOW_SCORE_ALERT',
    category: 'CUSTOMER',
    priority: 'MEDIUM',
    buildNotification: (p) => ({
      title: 'Customer feedback alert',
      body: `${p.customerName} gave a ${p.score}/10 rating`,
      actionUrl: `/customers/${p.customerId}`,
      actionLabel: 'Follow up',
    }),
  },

  // LOW: Daily summary items (batched)
  {
    event: 'DAILY_SUMMARY',
    category: 'SYSTEM',
    priority: 'LOW',
    buildNotification: (p) => ({
      title: 'Daily summary',
      body: `${p.tasksCount} tasks, $${p.revenue} revenue`,
    }),
  },
];
```

### Files to Create

```
apps/api/src/modules/smart-notifications/
├── smart-notifications.module.ts
├── smart-notifications.service.ts    # Core notification logic
├── notification-preferences.service.ts
├── notification-scheduler.service.ts # Handle quiet hours, batching
├── notification-digest.processor.ts  # Daily digest BullMQ job
└── handlers/
    └── notification-event.handler.ts  # @OnEvent handlers
```

---

## Sprint 8.4: Revenue Optimization Tips

**Goal:** AI-generated suggestions to increase revenue.

### Tip Categories

| Category | Examples |
|----------|----------|
| Pricing | "Your haircut price is 15% below market average" |
| Upsells | "3 customers got quotes but not the premium package" |
| Timing | "Tuesdays have 40% more cancellations - consider overbooking" |
| Dormant | "12 customers haven't visited in 90+ days - reactivation campaign?" |
| Reviews | "Your Google rating dropped 0.2 stars this month" |

### Database Schema

```prisma
model RevenueTip {
  id            String   @id @default(uuid())
  tenantId      String
  category      RevenueTipCategory
  title         String
  description   String   @db.Text
  impact        String   // "~$500/month potential"
  difficulty    String   // EASY, MEDIUM, HARD
  actionType    String?
  actionParams  Json?
  dataPoints    Json?    // Supporting metrics
  generatedAt   DateTime @default(now())
  dismissedAt   DateTime?
  implementedAt DateTime?
  status        String   @default("ACTIVE")

  @@index([tenantId, status])
}

enum RevenueTipCategory {
  PRICING
  UPSELL
  TIMING
  DORMANT
  REVIEWS
  EFFICIENCY
}
```

### Tip Generator

```typescript
// apps/api/src/modules/revenue-tips/revenue-tips.generator.ts
@Injectable()
export class RevenueTipsGenerator {
  // Run weekly to generate fresh tips
  @Cron('0 6 * * 1') // Monday 6 AM
  async generateWeeklyTips(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const tenant of tenants) {
      await this.generateTipsForTenant(tenant.id);
    }
  }

  async generateTipsForTenant(tenantId: string): Promise<void> {
    // Gather business metrics
    const metrics = await this.gatherMetrics(tenantId);

    // Use AI to generate insights
    const tips = await this.aiEngine.generate({
      template: 'revenue.generate-tips',
      variables: {
        businessMetrics: JSON.stringify(metrics),
        existingTips: await this.getExistingTips(tenantId),
      },
      tenantId,
      expectJson: true,
    });

    // Store new tips
    for (const tip of tips) {
      await this.prisma.revenueTip.create({
        data: { tenantId, ...tip },
      });
    }
  }

  private async gatherMetrics(tenantId: string) {
    const [revenue, quotes, customers, appointments, reviews] = await Promise.all([
      this.getRevenueMetrics(tenantId),
      this.getQuoteMetrics(tenantId),
      this.getCustomerMetrics(tenantId),
      this.getAppointmentMetrics(tenantId),
      this.getReviewMetrics(tenantId),
    ]);

    return { revenue, quotes, customers, appointments, reviews };
  }
}
```

### Prompt Template

```typescript
// Add to apps/api/src/modules/ai-engine/prompt-templates.ts
'revenue.generate-tips': `
  Analyze this business data and generate 3-5 actionable revenue tips.

  Business Metrics:
  {businessMetrics}

  Existing Tips (avoid duplicates):
  {existingTips}

  Generate tips that are:
  - Specific and actionable (not generic advice)
  - Based on the actual data patterns
  - Achievable by a small business owner
  - Prioritized by potential impact

  Return JSON array:
  [
    {
      "category": "PRICING|UPSELL|TIMING|DORMANT|REVIEWS|EFFICIENCY",
      "title": "Short title (under 50 chars)",
      "description": "Detailed explanation with specific numbers",
      "impact": "~$X/month potential",
      "difficulty": "EASY|MEDIUM|HARD",
      "dataPoints": { "metric": "value" }
    }
  ]
`,
```

### Frontend Component

```typescript
// apps/web/components/insights/revenue-tips.tsx
export function RevenueTips() {
  const { tips, isLoading, dismissTip, implementTip } = useRevenueTips();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="trending-up" className="text-green-500" />
          Revenue Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tips.map((tip) => (
          <div key={tip.id} className="p-4 border rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant={difficultyVariant[tip.difficulty]}>
                  {tip.difficulty}
                </Badge>
                <h4 className="font-medium mt-2">{tip.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {tip.description}
                </p>
                <p className="text-sm font-medium text-green-600 mt-2">
                  {tip.impact}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dismissTip(tip.id)}
                >
                  Dismiss
                </Button>
                {tip.actionType && (
                  <Button
                    size="sm"
                    onClick={() => implementTip(tip.id)}
                  >
                    Take action
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## Implementation Checklist

### Sprint 8.1: Daily Task Suggestions
- [ ] Create `DailyTask` Prisma model and migrate
- [ ] Create `daily-tasks` module with service, controller, generator
- [ ] Implement task generation rules
- [ ] Create BullMQ processor for nightly generation
- [ ] Create `DailyTasks` frontend component
- [ ] Add `useDailyTasks` hook
- [ ] Integrate into dashboard page
- [ ] Write unit tests

### Sprint 8.2: Dashboard Quick Actions
- [ ] Create `QuickActionLog` Prisma model
- [ ] Create `quick-actions` module with handlers
- [ ] Implement action handlers for each type
- [ ] Create `QuickActionButton` component
- [ ] Add quick action buttons to relevant pages
- [ ] Write unit tests

### Sprint 8.3: Smart Notifications
- [ ] Create `NotificationPreference` and `SmartNotification` models
- [ ] Create `smart-notifications` module
- [ ] Implement notification rules and event handlers
- [ ] Create digest processor for batched notifications
- [ ] Create notification preferences UI
- [ ] Write unit tests

### Sprint 8.4: Revenue Optimization Tips
- [ ] Create `RevenueTip` Prisma model
- [ ] Create `revenue-tips` module with generator
- [ ] Add AI prompt template for tip generation
- [ ] Create `RevenueTips` frontend component
- [ ] Integrate into insights page
- [ ] Write unit tests

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Daily task completion rate | >50% |
| Quick action usage | 10+ per tenant per week |
| Notification open rate | >40% |
| Revenue tip implementation | 2+ per month per tenant |
| User engagement (dashboard time) | +20% |

---

## What We're NOT Building (Yet)

- Push notifications (web/mobile) - start with email/SMS
- Slack/Teams integrations - defer until requested
- AI task prioritization - simple rules first
- Gamification (streaks, points) - measure engagement first
- Team task assignment - single-user MVP first
