# Smart Business Assistant: Pain Point Solutions Implementation Plan

> **For the implementing Claude instance:** This plan has 9 sprints (7.0 through 7.8). Each sprint has two parts: an **automation base** (BullMQ queues, cron jobs, sequences) AND an **AI intelligence layer** (Claude-powered scoring, personalization, prediction). Build both together for each sprint. Start with Sprint 7.0 — it's the AI foundation all other sprints depend on.

## Sprint Execution Order

| Order | Sprint | Name | What It Builds | Dependencies |
|-------|--------|------|---------------|-------------|
| **1** | 7.0 | AI Engine Foundation | Central Claude wrapper, prompt templates, cost tracking, feedback loop | None — build first |
| **2** | 7.1 | Quote Follow-Up + AI Scoring | Follow-up pipeline + Claude conversion scoring + personalized messages | 7.0 |
| **3** | 7.2 | Payment Automation + AI Prediction | Payment reminders + deposits + Claude payment behavior prediction + cash flow forecast | 7.0 |
| **4** | 7.3 | No-Show Prevention + AI Risk Scoring | Confirmation flow + waitlist + Claude no-show risk scoring + adaptive reminders | 7.0, 7.2 |
| **5** | 7.4 | Review Pipeline + AI Intelligence | NPS-gated reviews + Claude personalized requests + AI review response drafts + theme mining | 7.0 |
| **6** | 7.5 | Retention Engine + AI Churn Prediction | Dormant detection + health scores + Claude churn prediction + personalized win-back | 7.0 |
| **7** | 7.6 | Smart Dispatch + AI Duration/Upsell | Skill matching + route optimization + Claude job duration prediction + upsell intelligence | 7.0 |
| **8** | 7.7 | AI Communication Brain | AI auto-responder + sentiment analysis + cross-channel memory + proactive outreach | 7.0 |
| **9** | 7.8 | AI Business Copilot | Natural language business queries + weekly AI reports + anomaly detection | 7.0, all others |

**Key architecture:** All AI calls go through the central `AiEngineService` (Sprint 7.0). Each sprint's automation base is in **Part 1**, and its AI intelligence layer is in **Part 2** of this document.

**Project location:** `/home/ubuntu/smart-business-assistant`
**Codebase rules:** Max 50 lines/function, max 200 lines/file, TypeScript strict, test-first (see CLAUDE.md)

---

## Research Summary

Based on Reddit (r/smallbusiness, r/HVAC, r/plumbing, r/sweatystartup, r/MechanicAdvice), Quora, industry forums (Garage Journal, HVAC-Talk, Automotive Management Network), and trade publications, small service businesses (plumbing, HVAC, auto repair, electrical) share 7 critical pain points **not fully addressed** by the current platform.

### The 7 Pain Points (by revenue impact)

| # | Pain Point | Source | Impact |
|---|-----------|--------|--------|
| 1 | **No automated quote follow-up** | Reddit, industry blogs | 90% of owners never follow up; 50% of leads die after first contact |
| 2 | **Cash flow bleeding from late payments** | r/sweatystartup, QuickBooks data | 43% of SMBs say cash flow is a problem; service businesses wait 30-90 days for payment |
| 3 | **No-shows destroying schedules** | r/smallbusiness, Booknetic | Automated reminders reduce no-shows by up to 90% |
| 4 | **Not enough Google reviews** | Industry data | 63.6% of customers check Google reviews; 50+ reviews = 35% more revenue |
| 5 | **Dormant customers never re-engaged** | Reddit, HubSpot | Retaining a customer costs 5x less than acquiring one; most shops do zero win-back |
| 6 | **Dispatch inefficiency** | Field service research | 59% of FSM orgs use AI scheduling; those without waste hours on manual dispatch |
| 7 | **No AI-powered text/chat responses** | Reddit AI threads, Workiz | After-hours inquiries go unanswered; 80% conversion if responded same day vs 60% after a week |

### Existing Gaps (Current Maturity)

| Area | Maturity | What Exists | What's Missing |
|------|----------|-------------|----------------|
| Quote Follow-up | 30% | Quote CRUD, PDF, SMS send | No automated sequence, no pipeline, no analytics |
| Payment Reminders | 40% | Invoices, Stripe, OVERDUE status | No auto-reminders, no deposits, no late fees |
| No-Show Prevention | 35% | 24h/1h SMS reminders | No confirmation tracking, no waitlist, no no-show flagging |
| Review Automation | 50% | Review requests, hourly cron | No NPS gating, no reputation dashboard, limited platforms |
| Customer Retention | 40% | Outbound campaigns (voice only) | No dormant detection, no automated re-engagement, no seasonal |
| Dispatch | 45% | Haversine routing, GPS tracking | No skill matching, no real-time traffic, no dispatch board |
| AI Communication | 35% | Voice AI (Vapi), messaging CRUD | No AI text/chat, no sentiment analysis, no auto-routing |

**Delivery channels for all features:** SMS (Twilio) + Email (Resend)

---

## PART 1: Automation Base (Sprints 7.1–7.7)

Each sprint below defines the automation infrastructure: BullMQ queues, cron jobs, database models, API endpoints, and frontend UI. The AI intelligence for each sprint is in Part 2.

### Sprint 7.1: Automated Quote Follow-Up Pipeline
**Pain point:** 90% of business owners don't follow up on quotes. Leads die silently.

**Scope:** Backend follow-up engine + frontend pipeline dashboard

**Files to create:**
- `apps/api/src/modules/quotes/quote-followup.service.ts` - Follow-up sequence orchestrator
- `apps/api/src/modules/quotes/quote-followup.processor.ts` - BullMQ job processor
- `apps/web/app/(dashboard)/quotes/page.tsx` - Quotes pipeline dashboard page
- `apps/web/components/quotes/quote-pipeline.tsx` - Visual pipeline component

**Files to modify:**
- `apps/api/src/modules/quotes/quotes.module.ts` - Register BullMQ queue, import followup service
- `apps/api/src/modules/quotes/quotes.service.ts` - Emit events on quote send, handle status changes
- `apps/api/prisma/schema.prisma` - Add QuoteFollowUp model

**Steps:**
1. Add `QuoteFollowUp` Prisma model:
   - Fields: `id`, `tenantId`, `quoteId`, `step` (1-4), `channel` (SMS/EMAIL), `scheduledAt`, `sentAt`, `status` (PENDING/SENT/CANCELLED), `createdAt`
   - Run `prisma migrate dev`
2. Create `quote-followup` BullMQ queue in quotes module
3. Implement `QuoteFollowupService`:
   - `scheduleFollowUps(quoteId)` - Creates 4 delayed jobs when a quote is sent:
     - Step 1 (Day 2): SMS - "Hi {name}, just checking if you had questions about your {service} quote for ${amount}"
     - Step 2 (Day 5): Email - Detailed follow-up with quote PDF attached
     - Step 3 (Day 10): SMS - "Your quote for {service} expires in 5 days. Reply YES to book or STOP to opt out"
     - Step 4 (Day 14): Final email - "We'd hate to lose you" with small discount offer
   - `cancelFollowUps(quoteId)` - Cancel pending follow-ups when quote accepted/declined
4. Implement `QuoteFollowupProcessor` - Processes each step, sends via SMS/Email services
5. Modify `QuotesService.updateStatus()` to call `cancelFollowUps` when status becomes ACCEPTED/DECLINED
6. Modify `QuotesService.sendQuote()` to call `scheduleFollowUps` after sending
7. Add conversion tracking fields to Quote model: `viewedAt`, `convertedAt`
8. Build quote pipeline dashboard page with stats: sent / following up / accepted / expired / conversion rate
9. Build pipeline visualization component showing quote funnel

**Test plan:**
- Create a quote, send it, verify 4 follow-up jobs scheduled in BullMQ
- Accept a quote mid-sequence, verify remaining jobs cancelled
- Check pipeline dashboard renders correct counts

---

### Sprint 7.2: Payment Automation & Cash Flow Protection
**Pain point:** 43% of SMBs have cash flow problems. Service businesses wait 30-90 days for payment.

**Scope:** Auto payment reminders + deposit collection + cash flow dashboard

**Files to create:**
- `apps/api/src/modules/invoices/payment-reminder.service.ts` - Reminder sequence orchestrator
- `apps/api/src/modules/invoices/payment-reminder.processor.ts` - BullMQ job processor
- `apps/web/components/settings/payment-settings.tsx` - Payment configuration UI

**Files to modify:**
- `apps/api/src/modules/invoices/invoices.module.ts` - Register reminder queue
- `apps/api/src/modules/invoices/invoices.service.ts` - Auto-mark overdue (daily cron), trigger reminders on send
- `apps/api/src/modules/payments/payments.service.ts` - Deposit payment intent creation
- `apps/api/src/modules/public-booking/public-booking.service.ts` - Require deposit at booking
- `apps/api/src/modules/settings/settings.service.ts` - Add payment settings fields
- `apps/api/prisma/schema.prisma` - Add PaymentReminder model, deposit fields on Invoice, payment settings on Tenant

**Steps:**
1. Add `PaymentReminder` Prisma model:
   - Fields: `id`, `tenantId`, `invoiceId`, `step` (1-5), `channel`, `scheduledAt`, `sentAt`, `status`, `createdAt`
2. Add fields to existing models:
   - Invoice: `depositAmount Float?`, `lateFeeApplied Boolean @default(false)`, `lateFeeAmount Float?`
   - Tenant settings: `depositRequired Boolean`, `depositPercentage Int`, `lateFeePercentage Int`, `reminderEnabled Boolean`
3. Run `prisma migrate dev`
4. Create `payment-reminders` BullMQ queue
5. Implement `PaymentReminderService`:
   - `scheduleReminders(invoiceId)` - Creates delayed jobs relative to due date:
     - Due - 3 days: SMS friendly reminder with payment link
     - Due date: Email "due today" with payment link
     - Due + 3 days: SMS overdue warning
     - Due + 7 days: Email final notice with late fee warning
     - Due + 14 days: SMS + Email escalation to business owner
   - `cancelReminders(invoiceId)` - Cancel when invoice paid
6. Implement `PaymentReminderProcessor` - Send reminders via SMS/Email
7. Add daily cron to `InvoicesService`: auto-mark OVERDUE, apply late fees per tenant settings
8. Modify `PaymentsService` to support deposit payment intents (partial amount)
9. Modify `PublicBookingService.createBooking()`:
   - Check tenant `depositRequired` setting
   - If true, create Stripe checkout for deposit amount
   - Store deposit status on appointment
10. Build payment settings UI: toggle reminders, set deposit %, set late fee %
11. Add cash flow dashboard widget: outstanding total, overdue total, avg days to payment

**Test plan:**
- Create and send invoice, verify 5 reminder jobs scheduled at correct offsets
- Pay invoice, verify remaining reminders cancelled
- Let invoice pass due date, verify auto-OVERDUE marking
- Test public booking with deposit required, verify Stripe checkout includes deposit amount

---

### Sprint 7.3: No-Show Prevention System
**Pain point:** No-shows destroy schedules. Automated reminders reduce them by up to 90%.

**Scope:** Enhanced reminders with confirmation + no-show tracking + waitlist

**Files to create:**
- `apps/api/src/modules/appointments/noshow-prevention.service.ts` - No-show tracking & waitlist logic
- `apps/web/components/appointments/confirmation-flow.tsx` - Customer confirmation UI

**Files to modify:**
- `apps/api/src/modules/appointments/appointments.service.ts` - Add NO_SHOW status handling, confirmation tracking
- `apps/api/src/modules/appointments/dto/` - Add no-show and confirmation fields
- `apps/api/src/modules/sms/sms.service.ts` - Parse inbound SMS replies (C/R) via Twilio webhook
- `apps/api/prisma/schema.prisma` - Add `noShowCount` to Customer, `confirmedAt` to Appointment, Waitlist model, NO_SHOW enum value

**Steps:**
1. Schema changes:
   - Customer: add `noShowCount Int @default(0)`
   - Appointment: add `confirmedAt DateTime?`, add `NO_SHOW` to status enum
   - New `Waitlist` model: `id`, `tenantId`, `customerId`, `serviceId`, `preferredDate`, `preferredStart`, `preferredEnd`, `status` (WAITING/OFFERED/BOOKED/EXPIRED), `notifiedAt`, `createdAt`
2. Run `prisma migrate dev`
3. Enhance existing SMS reminder crons (already sends at 24h and 1h):
   - Add 48h email reminder with appointment details + reschedule/cancel link
   - Modify 24h SMS to include confirmation prompt: "Reply C to confirm, R to reschedule"
   - Add 2h SMS: "Reminder: {technician} is on the way at {time}"
4. Implement inbound SMS webhook parsing in `SmsService`:
   - Parse "C" replies → mark appointment `confirmedAt = now()`
   - Parse "R" replies → send reschedule link
   - Alert dispatcher if appointment not confirmed 12h before
5. Implement `NoshowPreventionService`:
   - `markNoShow(appointmentId)` - Update status, increment customer `noShowCount`
   - `isHighRisk(customerId)` - Returns true if `noShowCount >= 2`
   - `requireDeposit(customerId)` - Auto-flag for deposit requirement
   - `addToWaitlist(customerId, serviceId, preferences)` - Create waitlist entry
   - `notifyWaitlist(serviceId, date, timeSlot)` - On cancellation, SMS first matching waitlisted customer
   - `confirmWaitlistBooking(waitlistId)` - First responder gets the slot
6. Build confirmation flow UI component (for link in SMS/email)
7. Add no-show analytics endpoint: rate by service type, day of week, customer

**Test plan:**
- Create appointment, verify 48h/24h/2h reminders fire correctly
- Simulate "C" SMS reply via Twilio webhook, verify `confirmedAt` set
- Mark appointment as NO_SHOW, verify customer `noShowCount` incremented
- Add customer to waitlist, cancel a matching appointment, verify notification sent

---

### Sprint 7.4: Smart Google Review Pipeline
**Pain point:** Businesses with 50+ reviews earn 35% more revenue. 63.6% of customers check Google reviews.

**Scope:** NPS-gated review requests + multi-platform + reputation dashboard

**Files to create:**
- `apps/api/src/modules/review-requests/smart-review.service.ts` - NPS-gated review orchestration
- `apps/web/app/(dashboard)/reviews/page.tsx` - Reputation dashboard page
- `apps/web/components/reviews/reputation-dashboard.tsx` - Dashboard component with charts

**Files to modify:**
- `apps/api/src/modules/review-requests/review-requests.service.ts` - Integrate NPS gating logic
- `apps/api/src/modules/review-requests/review-requests.module.ts` - Import NPS module, register event listeners
- `apps/api/src/modules/nps/nps.service.ts` - Emit `nps.completed` event with score data
- `apps/api/prisma/schema.prisma` - Add review tracking fields, platform support

**Steps:**
1. Schema changes:
   - ReviewRequest: add `platform String` (GOOGLE/YELP/FACEBOOK/BBB), `npsScore Int?`, `npsGated Boolean @default(true)`
   - Tenant settings: add `reviewPlatforms Json` (array of {platform, url}), `reviewTimingHours Int @default(3)`, `reviewMaxPerDay Int @default(2)`
2. Run `prisma migrate dev`
3. Modify `NpsService.submitSurvey()` to emit `nps.completed` event with `{customerId, score, jobId}`
4. Implement `SmartReviewService`:
   - Listen for `nps.completed` events
   - If score >= 9 (promoter): Schedule review request with direct Google/platform link (delayed by `reviewTimingHours`)
   - If score 7-8 (passive): Send "how can we improve?" feedback email (no review ask)
   - If score <= 6 (detractor): Alert manager via notification, do NOT request review
   - Enforce `reviewMaxPerDay` to stagger requests and avoid spam flags
   - Respect quiet hours (no sends after 8pm, before 9am - configurable)
5. Multi-platform deep link generation:
   - Google: `https://search.google.com/local/writereview?placeid={placeId}`
   - Yelp: `https://www.yelp.com/writeareview/biz/{bizId}`
   - Facebook: `https://www.facebook.com/{pageId}/reviews`
6. Add review response assistant endpoint:
   - `POST /review-requests/suggest-response` - Uses Claude API to generate response suggestion
   - Input: review text, rating, customer name
   - Output: suggested response text
7. Build reputation dashboard:
   - Total reviews by platform with bar chart
   - Average rating trend (line chart, monthly)
   - Review velocity (reviews per week)
   - NPS-to-review conversion rate
   - Recent reviews list with AI response suggestions

**Test plan:**
- Complete a job, submit NPS 9+, verify review request auto-created with Google link
- Submit NPS 5, verify NO review request and manager alert sent
- Verify `reviewMaxPerDay` rate limiting works
- Check reputation dashboard renders with sample data

---

### Sprint 7.5: Automated Customer Win-Back & Retention
**Pain point:** Retaining a customer costs 5x less than acquiring one. Most service businesses do zero win-back.

**Scope:** New module: dormant detection + re-engagement sequences + seasonal reminders + CLV

**Files to create:**
- `apps/api/src/modules/customer-retention/customer-retention.module.ts` - Module definition
- `apps/api/src/modules/customer-retention/customer-retention.service.ts` - Retention logic
- `apps/api/src/modules/customer-retention/retention.processor.ts` - BullMQ processor
- `apps/api/src/modules/customer-retention/dto/create-retention-campaign.dto.ts`
- `apps/api/src/modules/customer-retention/customer-retention.controller.ts`
- `apps/web/app/(dashboard)/retention/page.tsx` - Retention dashboard page
- `apps/web/components/retention/retention-dashboard.tsx` - Dashboard component

**Files to modify:**
- `apps/api/src/app.module.ts` - Register CustomerRetentionModule
- `apps/api/prisma/schema.prisma` - Add RetentionCampaign, ServiceInterval models

**Steps:**
1. Schema additions:
   - `RetentionCampaign` model: `id`, `tenantId`, `customerId`, `type` (DORMANT_WINBACK/SEASONAL/MAINTENANCE), `step` (1-3), `channel`, `scheduledAt`, `sentAt`, `status`, `discountCode`, `createdAt`
   - `ServiceInterval` model: `id`, `tenantId`, `serviceId`, `intervalDays` (e.g., 180), `reminderDays` (days before interval to remind)
2. Run `prisma migrate dev`
3. Create `CustomerRetentionModule` with BullMQ queue `retention-campaigns`
4. Implement `CustomerRetentionService`:
   - **Daily cron (9am) - Dormant detection:**
     - Query customers with no appointment in 90+ days (configurable per tenant)
     - Exclude customers already in active retention sequence
     - Create retention campaign entries with 3-step sequence:
       - Step 1 (Day 0): SMS - "Hi {name}, it's been a while! Need any {lastService} help? Book here: {link}"
       - Step 2 (Day 30): Email - "We miss you" with 10% discount code
       - Step 3 (Day 60): SMS - Final win-back with limited-time offer
     - Auto-cancel sequence when customer books
   - **Daily cron (10am) - Maintenance reminders:**
     - Query ServiceIntervals and find customers whose last service of that type exceeds intervalDays
     - Send SMS: "It's been {months} since your last {service}. Time for a check-up? Book here: {link}"
   - **CLV calculation:**
     - `calculateCLV(customerId)` - Total spend, visit frequency, avg ticket, first/last visit
     - `getTopCustomers(tenantId, limit)` - Top N by CLV
     - `getChurnRate(tenantId, periodDays)` - % of customers not returning within period
5. Implement `RetentionProcessor` - Process each campaign step, send via SMS/Email
6. Create controller with endpoints:
   - `GET /customer-retention/dashboard` - Retention metrics
   - `GET /customer-retention/dormant` - List dormant customers
   - `GET /customer-retention/campaigns` - Active campaigns
   - `POST /customer-retention/service-intervals` - Configure maintenance intervals
7. Build retention dashboard:
   - Dormant customer count with trend
   - Win-back success rate
   - CLV distribution chart
   - Churn rate over time
   - Active campaign status
   - Top customers by CLV

**Test plan:**
- Create customer with last appointment 91 days ago, run cron, verify dormant detection + SMS sent
- Book appointment for dormant customer, verify retention sequence cancelled
- Configure service interval, verify maintenance reminder sent at correct time
- Check CLV calculation with sample customer data

---

### Sprint 7.6: Smart Dispatch & Route Optimization
**Pain point:** Technicians waste hours driving without skill-matching and route optimization.

**Scope:** Skill-based matching + enhanced routing + dynamic reassignment + dispatch board UI

**Files to create:**
- `apps/api/src/modules/ai-scheduling/smart-dispatch.service.ts` - Dispatch logic with skill matching
- `apps/web/app/(dashboard)/dispatch/page.tsx` - Dispatch board page
- `apps/web/components/dispatch/dispatch-board.tsx` - Dispatch board component
- `apps/web/components/dispatch/route-map.tsx` - Map visualization component

**Files to modify:**
- `apps/api/src/modules/ai-scheduling/ai-scheduling.service.ts` - Integrate skill matching into route optimization
- `apps/api/src/modules/ai-scheduling/ai-scheduling.module.ts` - Register smart dispatch service
- `apps/api/src/modules/jobs/jobs.service.ts` - Dynamic reassignment logic
- `apps/api/src/modules/team/team.service.ts` - Add skill management endpoints
- `apps/api/prisma/schema.prisma` - Add TechnicianSkill model

**Steps:**
1. Schema additions:
   - `TechnicianSkill` model: `id`, `tenantId`, `teamMemberId`, `serviceId`, `level` (BASIC/INTERMEDIATE/EXPERT)
   - Add unique constraint on `[teamMemberId, serviceId]`
2. Run `prisma migrate dev`
3. Add skill management to `TeamService`:
   - `setSkills(teamMemberId, skills[])` - Set technician skills
   - `getSkillsForService(tenantId, serviceId)` - Find qualified technicians
4. Implement `SmartDispatchService`:
   - `findBestTechnician(serviceId, date, location)`:
     - Query technicians with matching skill for service type
     - Rank by: skill level (EXPERT first) → proximity to job → current workload
     - Fallback to nearest available if no skill match
   - `optimizeRoute(technicianId, date)`:
     - Integrate Google Maps Distance Matrix API (existing TODO in codebase)
     - Consider real-world drive times instead of Haversine-only
     - Add time window constraints (customer preferred arrival windows)
     - Return optimized job order with ETAs
   - `suggestReassignment(jobId)`:
     - When job runs long, find nearest available technician for next jobs
     - Push notification to dispatcher with reassignment suggestion
   - `fillCancellationGap(technicianId, date, cancelledTimeSlot)`:
     - Find nearby pending jobs that could fill the gap
     - Suggest to dispatcher
5. Build dispatch board page:
   - Map view showing technician pins (color by status) and job pins
   - Left panel: list of today's jobs grouped by technician
   - Drag-and-drop job reassignment between technicians
   - Click technician → see route, ETA for each stop
   - Real-time updates via existing WebSocket infrastructure
6. Build route map component:
   - Draw optimized route lines on map
   - Show drive time between stops
   - Color-code jobs: completed (green), in-progress (blue), upcoming (gray)
7. End-of-day summary endpoint:
   - Total miles driven, jobs completed per technician
   - Route efficiency score (actual vs optimal)

**Test plan:**
- Add skills to 3 technicians, create job for specific service, verify correct technician matched
- Optimize route for 5 jobs, verify Google Maps API called and order optimized
- Simulate long-running job, verify reassignment suggestion generated
- Open dispatch board, verify map renders with technician/job pins

---

### Sprint 7.7: AI-Powered Customer Communication Assistant
**Pain point:** After-hours inquiries go unanswered. Same-day response = 80% conversion.

**Scope:** New module: AI auto-responder + suggested replies + sentiment analysis + smart routing

**Files to create:**
- `apps/api/src/modules/ai-communication/ai-communication.module.ts` - Module definition
- `apps/api/src/modules/ai-communication/ai-communication.service.ts` - AI response generation
- `apps/api/src/modules/ai-communication/ai-responder.processor.ts` - BullMQ processor
- `apps/api/src/modules/ai-communication/ai-communication.controller.ts` - Endpoints
- `apps/web/components/messaging/ai-assistant-panel.tsx` - AI suggestion panel in messaging UI

**Files to modify:**
- `apps/api/src/modules/messaging/messaging.service.ts` - Hook inbound messages into AI pipeline
- `apps/api/src/modules/sms/sms.service.ts` - Route inbound SMS to AI when outside business hours
- `apps/api/src/app.module.ts` - Register AICommunicationModule
- `apps/api/prisma/schema.prisma` - Add AIConversation model

**Steps:**
1. Schema additions:
   - `AIConversation` model: `id`, `tenantId`, `customerId`, `channel` (SMS/EMAIL/WHATSAPP), `intent` (BOOKING/PRICING/STATUS/COMPLAINT/OTHER), `sentiment` (POSITIVE/NEUTRAL/NEGATIVE/URGENT), `aiHandled Boolean`, `escalated Boolean`, `summary String?`, `createdAt`
   - `SuggestedResponse` model: `id`, `tenantId`, `conversationId`, `messageId`, `suggestion String`, `accepted Boolean?`, `editedText String?`, `createdAt`
2. Run `prisma migrate dev`
3. Create `AICommunicationModule` with BullMQ queue `ai-responder`
4. Implement `AICommunicationService`:
   - **`analyzeMessage(text)`** - Claude API call to classify:
     - Intent: BOOKING, PRICING, STATUS, COMPLAINT, OTHER
     - Sentiment: POSITIVE, NEUTRAL, NEGATIVE, URGENT
     - Return structured analysis
   - **`generateAutoResponse(customerId, messageText, tenantId)`**:
     - Fetch customer context (from customer-context module)
     - Fetch business services, pricing, available slots
     - Prompt Claude with context + message to generate helpful response
     - Handle intents: booking → offer slots, pricing → provide ranges, status → lookup job, emergency → provide emergency number
     - Flag for escalation if: complaint, unclear intent, or complex request
   - **`generateSuggestion(messageId)`**:
     - During business hours: generate response suggestion (NOT auto-sent)
     - Store in SuggestedResponse table
     - Team member approves/edits/dismisses
   - **`routeConversation(conversationId, intent)`**:
     - Map intent to team role (BOOKING → DISPATCHER, COMPLAINT → MANAGER, etc.)
     - Auto-assign conversation to available team member
   - **`summarizeConversation(conversationId)`**:
     - After conversation marked resolved, generate AI summary
     - Store on customer record for future context
5. Modify `SmsService` inbound webhook:
   - Check tenant business hours setting
   - Outside hours: queue message for AI auto-response
   - Inside hours: queue for AI suggestion (not auto-send)
6. Modify `MessagingService`:
   - On new inbound message: trigger `analyzeMessage` for sentiment/intent
   - Auto-flag URGENT/NEGATIVE for priority
   - Generate suggested response for team
7. Build AI assistant panel component:
   - Show AI-suggested response below message compose area
   - "Accept", "Edit", "Dismiss" buttons
   - Sentiment indicator badge on conversations (green/yellow/red)
   - Intent tag on each conversation

**Test plan:**
- Send inbound SMS outside business hours, verify AI auto-response generated and sent
- Send inbound SMS during business hours, verify suggestion generated but NOT auto-sent
- Send negative message, verify URGENT flag and manager routing
- Resolve conversation, verify AI summary generated

---

## Database Schema Changes (All Sprints)

```prisma
// Sprint 7.1 - Quote Follow-Up
model QuoteFollowUp {
  id          String   @id @default(uuid())
  tenantId    String
  quoteId     String
  step        Int
  channel     String
  scheduledAt DateTime
  sentAt      DateTime?
  status      String   // PENDING, SENT, CANCELLED
  createdAt   DateTime @default(now())
  @@index([tenantId])
  @@index([quoteId])
  @@index([status, scheduledAt])
}

// Sprint 7.2 - Payment Reminders
model PaymentReminder {
  id          String   @id @default(uuid())
  tenantId    String
  invoiceId   String
  step        Int
  channel     String
  scheduledAt DateTime
  sentAt      DateTime?
  status      String
  createdAt   DateTime @default(now())
  @@index([tenantId])
  @@index([invoiceId])
  @@index([status, scheduledAt])
}

// Sprint 7.3 - Waitlist
model Waitlist {
  id             String   @id @default(uuid())
  tenantId       String
  customerId     String
  serviceId      String
  preferredDate  DateTime
  preferredStart String
  preferredEnd   String
  status         String   // WAITING, OFFERED, BOOKED, EXPIRED
  notifiedAt     DateTime?
  createdAt      DateTime @default(now())
  @@index([tenantId])
  @@index([serviceId, preferredDate])
}

// Sprint 7.5 - Retention
model RetentionCampaign {
  id            String   @id @default(uuid())
  tenantId      String
  customerId    String
  type          String   // DORMANT_WINBACK, SEASONAL, MAINTENANCE
  step          Int
  channel       String
  scheduledAt   DateTime
  sentAt        DateTime?
  status        String
  discountCode  String?
  createdAt     DateTime @default(now())
  @@index([tenantId])
  @@index([customerId])
  @@index([status, scheduledAt])
}

model ServiceInterval {
  id           String @id @default(uuid())
  tenantId     String
  serviceId    String
  intervalDays Int
  reminderDays Int
  @@index([tenantId])
  @@unique([tenantId, serviceId])
}

// Sprint 7.6 - Technician Skills
model TechnicianSkill {
  id           String @id @default(uuid())
  tenantId     String
  teamMemberId String
  serviceId    String
  level        String // BASIC, INTERMEDIATE, EXPERT
  @@index([tenantId])
  @@unique([teamMemberId, serviceId])
}

// Sprint 7.7 - AI Communication
model AIConversation {
  id         String   @id @default(uuid())
  tenantId   String
  customerId String
  channel    String
  intent     String
  sentiment  String
  aiHandled  Boolean
  escalated  Boolean
  summary    String?
  createdAt  DateTime @default(now())
  @@index([tenantId])
  @@index([customerId])
}

model SuggestedResponse {
  id             String   @id @default(uuid())
  tenantId       String
  conversationId String
  messageId      String
  suggestion     String
  accepted       Boolean?
  editedText     String?
  createdAt      DateTime @default(now())
  @@index([tenantId])
  @@index([conversationId])
}

// Modifications to existing models:
// Customer: add noShowCount Int @default(0)
// Appointment: add confirmedAt DateTime?, add NO_SHOW to status enum
// Invoice: add depositAmount Float?, lateFeeApplied Boolean @default(false), lateFeeAmount Float?
// Quote: add viewedAt DateTime?, convertedAt DateTime?
// Tenant settings: add depositRequired, depositPercentage, lateFeePercentage, reminderEnabled, reviewPlatforms Json, reviewTimingHours, reviewMaxPerDay, businessHoursStart, businessHoursEnd
```

## BullMQ Queues to Add

| Queue | Sprint | Trigger | Purpose |
|-------|--------|---------|---------|
| `quote-followup` | 7.1 | On quote send | 4-step follow-up sequence (Day 2, 5, 10, 14) |
| `payment-reminders` | 7.2 | On invoice send | 5-step reminder sequence (Due-3 to Due+14) |
| `noshow-confirmation` | 7.3 | Enhanced existing cron | 48h/24h/2h reminders with confirmation |
| `waitlist-notify` | 7.3 | On appointment cancel | Notify matching waitlisted customers |
| `review-pipeline` | 7.4 | On NPS completion | NPS-gated review request with smart timing |
| `retention-campaigns` | 7.5 | Daily cron 9am | Dormant detection + re-engagement |
| `maintenance-reminders` | 7.5 | Daily cron 10am | Service interval reminders |
| `ai-responder` | 7.7 | On inbound message | AI response generation + routing |

---
---

# PART 2: AI Intelligence Layer

## The Paradigm Shift

The 7 sprints above add **automation** — timer-based sequences, fixed rules, template messages. This section transforms every feature from automation to **intelligence** by embedding Claude AI as the decision-making brain.

### What Changes

| Aspect | Before (Automation Only) | After (AI-Native) |
|--------|--------------------------|-------------------|
| Follow-up timing | Fixed Day 2, 5, 10, 14 | AI predicts optimal time per customer |
| Message content | Generic templates | Claude writes unique messages per context |
| Payment reminders | Same tone for everyone | AI calibrates tone by relationship value |
| No-show handling | Same reminders for all | AI scores risk, adjusts urgency dynamically |
| Review requests | Hourly cron for all | NPS-gated + AI-timed for max conversion |
| Customer retention | Fixed 90-day threshold | AI predicts churn before it happens |
| Dispatch | Nearest technician | AI weighs skills + travel + customer history + predicted job duration |
| Communication | Template responses | Claude generates contextual responses with full customer history |

### Existing AI Foundation to Build On

| Capability | Technology | File | What It Does Now |
|-----------|-----------|------|-----------------|
| Equipment prediction | Claude Sonnet 4 | `prediction.service.ts` | Analyzes equipment → JSON maintenance alerts |
| Photo-based quotes | Claude Vision | `photo-quotes.service.ts` | Photos → price estimates + issue identification |
| Voice assistant | Vapi.ai + GPT-4 | `voice.service.ts` | Phone calls with function calling (book, check slots) |
| Customer context | Database + Cache | `customer-context.service.ts` | Aggregates customer history for AI personalization |
| Preference learning | Statistical ML | `preference-learning.service.ts` | Learns preferred booking days/times |
| Dynamic pricing | Rule-based engine | `dynamic-pricing.service.ts` | Demand/urgency/loyalty multipliers |

---

## Sprint 7.0: AI Engine Foundation (Build First)

**Purpose:** Create a centralized AI service that all modules use, with consistent prompts, cost tracking, caching, and feedback loops. Without this, each module would create its own Anthropic client and duplicate patterns.

**Files to create:**
- `apps/api/src/modules/ai-engine/ai-engine.module.ts` - Module definition
- `apps/api/src/modules/ai-engine/ai-engine.service.ts` - Central Claude API wrapper
- `apps/api/src/modules/ai-engine/prompt-templates.ts` - All AI prompt templates
- `apps/api/src/modules/ai-engine/ai-cost-tracker.service.ts` - Token usage tracking
- `apps/api/src/modules/ai-engine/ai-feedback.service.ts` - Track accept/edit/reject of AI outputs

**Files to modify:**
- `apps/api/src/app.module.ts` - Register AiEngineModule
- `apps/api/prisma/schema.prisma` - Add AiUsageLog, AiFeedback models

**Implementation:**

### 1. `AiEngineService` — Central Claude Wrapper
```typescript
@Injectable()
export class AiEngineService {
  // Single Anthropic client shared across all modules
  // Methods:

  async analyze(opts: {
    template: string;        // Template key from prompt-templates.ts
    variables: Record<string, any>; // Template variables
    tenantId: string;        // For cost tracking
    feature: string;         // 'quote-scoring', 'payment-prediction', etc.
    maxTokens?: number;      // Default 1024
    expectJson?: boolean;    // Auto-parse JSON response
  }): Promise<AiResponse>

  async analyzeWithVision(opts: {
    template: string;
    imageUrl: string;
    variables: Record<string, any>;
    tenantId: string;
    feature: string;
  }): Promise<AiResponse>

  async generateText(opts: {
    template: string;
    variables: Record<string, any>;
    tenantId: string;
    feature: string;
    tone?: 'friendly' | 'professional' | 'urgent' | 'empathetic';
  }): Promise<string>   // Returns raw text, not JSON
}
```

### 2. `PromptTemplates` — Managed Prompt Library
All AI prompts live in one place for easy iteration:
```typescript
export const PROMPT_TEMPLATES = {
  // Quote Intelligence
  'quote.score-conversion': `Analyze this quote and predict conversion likelihood...`,
  'quote.generate-followup': `Write a personalized follow-up message...`,
  'quote.predict-objections': `Predict the customer's likely objections...`,

  // Payment Intelligence
  'payment.predict-behavior': `Predict this customer's payment behavior...`,
  'payment.calibrate-tone': `Determine the appropriate tone for a payment reminder...`,
  'payment.forecast-cashflow': `Forecast cash flow for the next {period}...`,

  // No-Show Intelligence
  'noshow.score-risk': `Score the no-show risk for this appointment...`,
  'noshow.craft-reminder': `Write a personalized appointment reminder...`,

  // Review Intelligence
  'review.generate-request': `Write a personalized review request...`,
  'review.draft-response': `Draft a response to this customer review...`,
  'review.analyze-themes': `Analyze these reviews and identify themes...`,

  // Retention Intelligence
  'retention.predict-churn': `Predict this customer's churn risk...`,
  'retention.generate-winback': `Write a personalized win-back message...`,
  'retention.predict-service-need': `Predict when this customer will need service...`,

  // Dispatch Intelligence
  'dispatch.estimate-duration': `Estimate how long this job will take...`,
  'dispatch.suggest-upsell': `Identify upsell opportunities for this job...`,

  // Communication Intelligence
  'comms.classify-intent': `Classify the intent and sentiment of this message...`,
  'comms.generate-response': `Generate a helpful response to this customer...`,
  'comms.summarize-conversation': `Summarize this conversation...`,

  // Business Copilot
  'copilot.answer-question': `Answer this business question using the data...`,
  'copilot.weekly-report': `Generate a weekly business performance report...`,
  'copilot.anomaly-detection': `Identify anomalies in this business data...`,
};
```

### 3. `AiCostTrackerService` — Usage & Cost Monitoring
```typescript
// Track every Claude API call per tenant per feature
// Enables: billing by AI usage, identifying expensive operations, usage dashboards
model AiUsageLog {
  id         String   @id @default(uuid())
  tenantId   String
  feature    String   // 'quote-scoring', 'payment-prediction', etc.
  template   String   // Prompt template key
  inputTokens  Int
  outputTokens Int
  costCents    Int     // Estimated cost in cents
  latencyMs    Int
  success      Boolean
  createdAt  DateTime @default(now())
  @@index([tenantId, feature])
  @@index([createdAt])
}
```

### 4. `AiFeedbackService` — Learn From Human Corrections
```typescript
// When AI generates a message/suggestion, track if human accepted, edited, or rejected
model AiFeedback {
  id          String   @id @default(uuid())
  tenantId    String
  feature     String
  template    String
  aiOutput    String   // What AI generated
  action      String   // ACCEPTED, EDITED, REJECTED
  humanEdit   String?  // What the human changed it to (if edited)
  createdAt   DateTime @default(now())
  @@index([tenantId, feature])
}
// This data enables: prompt refinement, per-tenant style learning, quality tracking
```

---

## AI Enhancements to Each Sprint

### Sprint 7.1 AI: Quote Conversion Intelligence

**What AI adds to the base follow-up pipeline:**

**New file:** `apps/api/src/modules/quotes/quote-intelligence.service.ts`

**AI Capabilities:**

#### a) Conversion Scoring (on quote creation)
When a quote is created, Claude scores conversion probability:
```
Prompt: quote.score-conversion
Input: {
  quoteAmount, serviceType, customerHistory (visits, spend, last service),
  marketAvgPrice (from dynamic pricing), daysSinceLastInteraction,
  customerSentiment (from past NPS/reviews), quoteComplexity
}
Output JSON: {
  conversionProbability: 0.0-1.0,
  riskFactors: ["price_sensitivity", "long_gap_since_last_visit"],
  recommendedAction: "follow_up_within_24h" | "offer_discount" | "standard_sequence",
  suggestedDiscount: 0-15 (percentage, if applicable),
  reasoning: "Customer hasn't visited in 6 months and this quote is 20% above market..."
}
```
- Quotes scoring >70% → Light-touch follow-up (1 message)
- Quotes scoring 30-70% → Full 4-step sequence with personalized messaging
- Quotes scoring <30% → Aggressive: Vapi voice follow-up + discount offer

#### b) AI-Written Follow-Up Messages (replace templates)
Instead of generic "Hi {name}, checking in about your quote", Claude writes each message:
```
Prompt: quote.generate-followup
Input: {
  customerName, serviceType, quoteAmount, step (1-4),
  previousInteractionSummary, conversionScore, predictedObjections,
  businessName, businessTone (professional/friendly/casual)
}
Output: Personalized SMS or email text
```
Example AI output: "Hi Sarah, I noticed your AC system is 12 years old based on our inspection last week. The $2,400 quote we sent covers a full replacement that'll cut your energy bills by about 30%. Happy to walk through financing options if the upfront cost is a concern — just reply here or call us."

#### c) Objection Prediction & Preemptive Addressing
```
Prompt: quote.predict-objections
Input: {
  quoteAmount, serviceType, customerIncome (inferred from zip),
  competitorPricing, customerHistory, timeOfYear
}
Output JSON: {
  likelyObjections: [
    { objection: "price_too_high", probability: 0.7, counterArgument: "..." },
    { objection: "want_second_opinion", probability: 0.4, counterArgument: "..." }
  ]
}
```
Follow-up messages preemptively address the #1 predicted objection.

#### d) Voice Follow-Up (Vapi integration for cold quotes)
After text/email follow-ups fail (Steps 1-3), Step 4 becomes a **Vapi AI phone call** instead of a final email:
- Voice agent calls with full quote context
- Natural conversation: "Hi Sarah, this is the AI assistant from Comfort HVAC. I'm calling about the AC quote we sent over two weeks ago. Did you have any questions I could help with?"
- Can answer questions, offer discount, and book the appointment on the call
- Call result feeds back into conversion analytics

#### e) Smart Channel & Timing Selection
AI determines per customer:
- **Best channel**: SMS vs Email (based on historical response data)
- **Best time**: Morning vs afternoon vs evening (from preference-learning data)
- **Best day**: Weekday vs weekend (from engagement patterns)

---

### Sprint 7.2 AI: Cash Flow Intelligence

**New file:** `apps/api/src/modules/invoices/payment-intelligence.service.ts`

**AI Capabilities:**

#### a) Payment Behavior Prediction (on invoice creation)
```
Prompt: payment.predict-behavior
Input: {
  customerPaymentHistory (past invoices: amounts, days to pay, late count),
  invoiceAmount, serviceType, customerTenure, recentNPSScore,
  currentOutstanding (other unpaid invoices)
}
Output JSON: {
  onTimePaymentProbability: 0.0-1.0,
  predictedDaysToPayment: 14,
  riskLevel: "LOW" | "MEDIUM" | "HIGH",
  recommendedTerms: "net-15" | "net-30" | "due-on-receipt",
  recommendedDepositPercent: 0-50,
  reasoning: "Customer has paid 8/10 invoices on time, avg 12 days..."
}
```
- HIGH risk → Shorter terms, require deposit, more aggressive reminders
- LOW risk → Standard terms, lighter reminders, maintain goodwill

#### b) Tone Calibration for Reminders
Instead of same message for everyone, Claude adjusts tone:
```
Prompt: payment.calibrate-tone
Input: {
  customerCLV, paymentHistorySummary, invoiceAge (days overdue),
  numberOfRemindersAlready, customerSentiment, isVIPCustomer
}
Output JSON: {
  tone: "warm" | "professional" | "firm" | "urgent",
  personalizedMessage: "the actual SMS/email text",
  escalationNeeded: boolean,
  shouldCallInstead: boolean
}
```
- VIP customer 3 days late: Warm & understanding
- Repeat offender 14 days late: Firm with consequences
- New customer: Professional and clear

#### c) Cash Flow Forecasting
Weekly AI-generated cash flow prediction:
```
Prompt: payment.forecast-cashflow
Input: {
  outstandingInvoices (amounts, ages, customer risk scores),
  upcomingScheduledWork (quote pipeline),
  historicalRevenue (last 12 months, weekly),
  seasonalPatterns, currentMonth
}
Output JSON: {
  nextWeekForecast: { expected: 12400, optimistic: 15000, pessimistic: 8900 },
  next30DayForecast: { ... },
  riskAlerts: ["3 high-value invoices overdue", "seasonal slowdown expected"],
  recommendations: ["Follow up on Invoice #234 - high value, medium risk"]
}
```
Displayed as a chart on the dashboard.

#### d) Smart Collections Voice Calls
For seriously overdue invoices (14+ days), instead of sending yet another SMS:
- Vapi AI calls the customer with full context
- "Hi, I'm calling from [Business] about invoice #234 for $1,200 that was due two weeks ago. I wanted to check if there's anything we can help with — we can set up a payment plan if that would make things easier."
- Can take payment over the phone (Stripe)
- Can negotiate and set up payment plans

---

### Sprint 7.3 AI: No-Show Risk Intelligence

**New file:** `apps/api/src/modules/appointments/noshow-intelligence.service.ts`

**AI Capabilities:**

#### a) No-Show Risk Scoring (on appointment creation)
```
Prompt: noshow.score-risk
Input: {
  customerNoShowCount, customerTotalAppointments, customerConfirmationRate,
  appointmentDayOfWeek, appointmentTimeOfDay, serviceType,
  bookingLeadTimeDays (how far in advance booked),
  isNewCustomer, weatherForecast (optional API integration)
}
Output JSON: {
  noShowProbability: 0.0-1.0,
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
  riskFactors: ["new_customer", "monday_morning", "booked_14_days_ago"],
  recommendations: {
    requireDeposit: boolean,
    extraReminder: boolean,
    overbookSlot: boolean,
    proactiveCallRecommended: boolean
  }
}
```

#### b) Adaptive Reminder Strategy
Based on risk score, AI adjusts the reminder approach:
- **LOW risk** (0-20%): Single 24h SMS, no confirmation needed
- **MEDIUM risk** (20-50%): Standard 48h email + 24h SMS with confirmation request
- **HIGH risk** (50-75%): Add 72h pre-reminder + require deposit + Vapi confirmation call
- **VERY HIGH risk** (75%+): All above + overbooking recommendation to dispatcher

#### c) Personalized Reminder Messages
```
Prompt: noshow.craft-reminder
Input: {
  customerName, serviceName, appointmentDate, appointmentTime,
  technicianName, customerHistory, riskScore, riskFactors
}
Output: Personalized reminder text
```
Example for high-risk new customer: "Hi Alex, just confirming your plumbing inspection tomorrow at 10am. Mike, our senior plumber, has set aside the morning for you. Reply C to confirm — we have a waitlist for this slot so please let us know either way!"

#### d) Smart Overbooking Recommendations
When aggregate no-show risk for a time slot exceeds a threshold:
- AI recommends overbooking (e.g., book 3 appointments when only 2 can be served)
- Dashboard shows risk-adjusted capacity vs actual bookings
- Historical accuracy tracking to refine the model

---

### Sprint 7.4 AI: Review Intelligence

**New file:** `apps/api/src/modules/review-requests/review-intelligence.service.ts`

**AI Capabilities:**

#### a) AI-Personalized Review Requests
Instead of generic "Please leave us a review":
```
Prompt: review.generate-request
Input: {
  customerName, servicePerformed, technicianName,
  npsScore, customerHistorySummary, businessName
}
Output: Personalized SMS text
```
Example: "Hi Sarah, thanks for trusting Comfort HVAC with your AC replacement yesterday! Mike mentioned the install went smoothly. If you have 30 seconds, a Google review would mean the world to our small team: [link]"

#### b) AI Review Response Drafting
For every review (positive or negative), Claude drafts a response:
```
Prompt: review.draft-response
Input: {
  reviewText, reviewRating (1-5), customerName,
  servicePerformed, businessName, businessOwnerName,
  isReturnCustomer
}
Output JSON: {
  suggestedResponse: "Thank you Sarah! We're glad Mike...",
  tone: "grateful" | "empathetic" | "professional",
  escalationNeeded: boolean,
  internalNote: "Customer mentioned slow response time - address with dispatch"
}
```

#### c) Review Theme Mining (weekly/monthly)
```
Prompt: review.analyze-themes
Input: {
  recentReviews (last 30-90 days, text + rating),
  businessType, serviceCategories
}
Output JSON: {
  positiveThemes: [
    { theme: "technician_professionalism", frequency: 12, sampleQuotes: [...] },
    { theme: "quick_response_time", frequency: 8, sampleQuotes: [...] }
  ],
  negativeThemes: [
    { theme: "pricing_transparency", frequency: 3, sampleQuotes: [...] }
  ],
  competitiveAdvantages: ["Same-day service", "Technician expertise"],
  improvementAreas: ["Price communication upfront"],
  overallSentimentTrend: "improving" | "stable" | "declining"
}
```
Surfaces in the reputation dashboard as actionable insights.

---

### Sprint 7.5 AI: Predictive Retention Engine

**New file:** `apps/api/src/modules/customer-retention/retention-intelligence.service.ts`

**AI Capabilities:**

#### a) Customer Health Score (real-time composite)
Every customer gets a 0-100 health score calculated from:
```
Signals:
- Appointment frequency (declining = -points)
- Payment behavior (on-time = +points, late = -points)
- NPS scores (high = +points, declining = -points)
- Communication engagement (responds to SMS = +points)
- Time since last interaction (longer = -points)
- Complaint history (-points)
- Referrals (+points)
- Quote acceptance rate (+points)
```
Health score updates daily, powers the retention dashboard.

#### b) Churn Prediction (proactive, before customer goes dormant)
```
Prompt: retention.predict-churn
Input: {
  customerHealthScore, appointmentFrequencyTrend,
  lastNPSScore, npsScoreTrend, paymentBehaviorTrend,
  recentInteractions, daysSinceLastService,
  serviceType, customerTenure, customerCLV
}
Output JSON: {
  churnProbability: 0.0-1.0,
  churnTimeframe: "30_days" | "60_days" | "90_days",
  churnReasons: ["declining_visit_frequency", "last_nps_was_passive"],
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  recommendedIntervention: {
    type: "personal_call" | "discount_offer" | "service_reminder" | "vip_treatment",
    message: "personalized outreach suggestion",
    urgency: "immediate" | "this_week" | "this_month"
  }
}
```
Run daily for all active customers. Catches at-risk customers **before** 90-day dormancy.

#### c) AI-Personalized Win-Back (not generic templates)
```
Prompt: retention.generate-winback
Input: {
  customerName, lastService, daysSinceLastVisit, totalVisits,
  totalSpent, churnReasons, businessName, currentPromotion
}
Output: Personalized win-back SMS/email text
```
Example: "Hi Tom, it's been 4 months since we tuned up your furnace. With winter coming, now's a great time for a pre-season check — and as a loyal customer (your 6th year with us!), we'd like to offer 15% off. Book here: [link]"

#### d) Predictive Service Needs
```
Prompt: retention.predict-service-need
Input: {
  customerEquipment (type, age, last service date),
  serviceHistory, seasonalPatterns, equipmentLifespan,
  localWeatherForecast
}
Output JSON: {
  predictedNeeds: [
    { service: "AC Tune-Up", predictedDate: "2026-04-15", confidence: 0.85,
      reason: "Annual maintenance due, pre-summer timing" },
    { service: "Filter Replacement", predictedDate: "2026-02-01", confidence: 0.92,
      reason: "Last replaced 5 months ago, 6-month cycle" }
  ]
}
```
Powers proactive outreach: "Your AC filter is due for replacement next month. Want us to schedule it?"

---

### Sprint 7.6 AI: Intelligent Dispatch Brain

**New file:** `apps/api/src/modules/ai-scheduling/dispatch-intelligence.service.ts`

**AI Capabilities:**

#### a) Job Duration Prediction
```
Prompt: dispatch.estimate-duration
Input: {
  serviceType, serviceDescription, equipmentType, equipmentAge, equipmentCondition,
  customerHistory (any complications in past jobs),
  technicianExperience (jobs completed of this type),
  isNewInstallation vs repair vs maintenance
}
Output JSON: {
  estimatedMinutes: 90,
  confidenceRange: { min: 60, max: 120 },
  complexityFactors: ["older_equipment", "access_may_be_difficult"],
  bufferRecommendation: 15 (minutes extra to schedule)
}
```
Feeds into route optimization to prevent cascading delays.

#### b) Upsell Intelligence (pushed to technician mobile)
```
Prompt: dispatch.suggest-upsell
Input: {
  currentJobService, customerEquipment (all equipment, ages, conditions),
  customerSpendHistory, maintenanceAlerts (from predictive-maintenance),
  lastServiceDates, currentSeason
}
Output JSON: {
  upsellOpportunities: [
    { service: "AC Filter Replacement", confidence: 0.9,
      reason: "Filter last changed 8 months ago",
      suggestedPitch: "While I'm here, I noticed your filter hasn't been changed in 8 months. I can swap it out in 5 minutes for $45.",
      estimatedRevenue: 45 },
    { service: "Duct Cleaning", confidence: 0.6,
      reason: "No duct cleaning in records, equipment is 5 years old",
      suggestedPitch: "...",
      estimatedRevenue: 250 }
  ],
  totalUpsellPotential: 295
}
```
Pushes to technician's mobile app before they arrive at the job.

#### c) Technician Performance Intelligence (weekly)
AI analyzes each technician's patterns:
- Average job duration vs estimate (running long = needs training?)
- Customer satisfaction by technician (NPS scores)
- Upsell success rate
- First-time fix rate
- Revenue generated per day
Generates coaching suggestions: "Mike completes AC installs 20% faster than average but has lower NPS on plumbing jobs — consider additional plumbing training."

---

### Sprint 7.7 AI: Omnichannel Communication Brain

Already designed as AI-native in the base sprint. Additional AI depth:

#### a) Cross-Channel Memory
Every AI interaction (voice call via Vapi, SMS, email, WhatsApp) writes to the same customer context. Claude sees the FULL conversation history across all channels:
```
Input to any AI response: {
  conversationHistory: [
    { channel: "VOICE", timestamp: "...", summary: "Called about AC quote, seemed interested but concerned about price" },
    { channel: "SMS", timestamp: "...", message: "Is there a payment plan option?" },
    { channel: "EMAIL", timestamp: "...", message: "Sent quote PDF with financing details" }
  ]
}
```
Customer never has to repeat themselves, regardless of channel.

#### b) Proactive AI Outreach
AI identifies situations where the business should reach out first:
- Job running 30+ min late → Auto-SMS customer: "Your technician Mike is running about 30 minutes behind. New ETA: 2:30 PM. Sorry for the delay!"
- Parts on backorder → Auto-email: "Update on your repair — the part we ordered is arriving Thursday. We'll call to schedule installation."
- Weather event → Mass notification: "Due to the ice storm warning, we're proactively checking on our HVAC customers. Need an emergency tune-up? Reply YES."

#### c) Communication Style Learning
Track how each business owner communicates (from their edits to AI suggestions):
- Tone preferences (casual vs formal)
- Emoji usage
- Signature style
- Common phrases
AI adapts to match the business owner's voice over time.

---

## Sprint 7.8: AI Business Copilot (NEW — The Crown Jewel)

**Pain point:** Business owners spend hours trying to understand their own data. They need a natural-language interface to ask questions and get instant answers.

**Scope:** Chat interface where owners can ask their business anything in plain English.

**Files to create:**
- `apps/api/src/modules/ai-copilot/ai-copilot.module.ts`
- `apps/api/src/modules/ai-copilot/ai-copilot.service.ts` - Query orchestrator
- `apps/api/src/modules/ai-copilot/copilot-tools.ts` - Database query functions for Claude tool use
- `apps/api/src/modules/ai-copilot/ai-copilot.controller.ts`
- `apps/api/src/modules/ai-copilot/weekly-report.service.ts` - Auto-generated reports
- `apps/web/app/(dashboard)/copilot/page.tsx` - Copilot chat interface
- `apps/web/components/copilot/copilot-chat.tsx` - Chat UI component
- `apps/web/components/copilot/insight-cards.tsx` - Visual insight cards

**Files to modify:**
- `apps/api/src/app.module.ts` - Register AiCopilotModule
- `apps/api/prisma/schema.prisma` - Add CopilotConversation model

**Architecture: Claude Tool Use for Business Queries**

The Copilot uses Claude's **tool use / function calling** to query the database. Claude decides which database queries to run, then synthesizes the results into natural-language answers.

```typescript
// Available tools Claude can call:
const COPILOT_TOOLS = [
  {
    name: 'get_revenue_summary',
    description: 'Get revenue totals for a date range',
    parameters: { startDate: string, endDate: string, groupBy?: 'day'|'week'|'month' }
  },
  {
    name: 'get_appointment_stats',
    description: 'Get appointment counts, completion rates, no-show rates',
    parameters: { startDate: string, endDate: string, technicianId?: string }
  },
  {
    name: 'get_customer_list',
    description: 'Get customers filtered by criteria',
    parameters: { status?: 'active'|'dormant'|'at_risk', sortBy?: 'clv'|'last_visit'|'spend', limit?: number }
  },
  {
    name: 'get_technician_performance',
    description: 'Get performance metrics for technicians',
    parameters: { technicianId?: string, startDate: string, endDate: string }
  },
  {
    name: 'get_quote_pipeline',
    description: 'Get quote conversion funnel metrics',
    parameters: { startDate: string, endDate: string }
  },
  {
    name: 'get_invoice_aging',
    description: 'Get outstanding invoices grouped by age',
    parameters: { }
  },
  {
    name: 'get_service_profitability',
    description: 'Get revenue and margin by service type',
    parameters: { startDate: string, endDate: string }
  },
  {
    name: 'get_customer_satisfaction',
    description: 'Get NPS scores, review ratings, trends',
    parameters: { startDate: string, endDate: string }
  },
  {
    name: 'get_retention_metrics',
    description: 'Get churn rate, dormant customer count, CLV distribution',
    parameters: { }
  },
  {
    name: 'get_schedule_utilization',
    description: 'Get technician utilization rates and capacity',
    parameters: { startDate: string, endDate: string }
  }
];
```

**Example Conversations:**

**Owner:** "How did we do this week?"
**Copilot:** *Calls get_revenue_summary, get_appointment_stats, get_customer_satisfaction*
→ "This week: $14,200 revenue (up 12% from last week), 23 jobs completed, 2 no-shows, 4.7 avg rating from 6 reviews. Your best day was Thursday with $4,100. Two quotes are still pending follow-up worth $3,800 total."

**Owner:** "Which service makes us the most money?"
**Copilot:** *Calls get_service_profitability*
→ "AC installations are your highest revenue service ($48,000 this quarter) but HVAC maintenance has the best margin at 62%. Plumbing repairs have the lowest margin at 38% — you might want to review your pricing there."

**Owner:** "Show me customers about to churn"
**Copilot:** *Calls get_customer_list with status='at_risk'*
→ "You have 8 customers flagged as at-risk. The highest value is Sarah Chen ($4,200 lifetime spend, last visit 78 days ago, NPS dropped from 9 to 7). I'd recommend a personal call — would you like me to draft a message?"

**Owner:** "Why did revenue drop last month?"
**Copilot:** *Calls get_revenue_summary (this month + last month), get_appointment_stats, get_quote_pipeline*
→ "Revenue dropped 18% primarily because: (1) 6 fewer AC installs due to mild weather — October is typically your slowest month, (2) your quote conversion rate dropped from 42% to 31% — 4 high-value quotes weren't followed up, (3) Mike was out 3 days which reduced capacity. The good news: November looks strong with 12 confirmed bookings already."

**Weekly AI Business Report (auto-generated every Monday):**
```
Prompt: copilot.weekly-report
Input: {
  revenueData, appointmentStats, quoteConversionRate,
  customerSatisfaction, cashFlowStatus, technicianPerformance,
  reviewsReceived, retentionMetrics, notableEvents
}
Output: Structured report with:
  - Key metrics vs last week
  - Top 3 wins
  - Top 3 areas needing attention
  - Specific action items (e.g., "Follow up with 3 pending quotes worth $5,200")
  - Revenue forecast for next week
```
Delivered via email and shown on dashboard.

**Anomaly Detection (daily):**
```
Prompt: copilot.anomaly-detection
Input: {
  todaysMetrics vs rollingAverage (30 days),
  unusualPatterns (sudden drop in bookings, spike in cancellations,
  cluster of negative reviews, cash flow irregularity)
}
Output JSON: {
  anomalies: [
    { type: "booking_drop", severity: "medium",
      description: "Bookings are 40% below your Tuesday average",
      possibleCause: "Your Google Ads may have paused",
      suggestedAction: "Check your ad campaigns and consider an outbound SMS blast" }
  ]
}
```
Pushes notifications for significant anomalies.

**Test plan for Sprint 7.8:**
- Ask "How did we do this week?" → verify tool calls and natural language response
- Ask "Which technician is most efficient?" → verify performance data queried
- Check weekly report generation (trigger manually)
- Verify anomaly detection catches simulated booking drop
- Test multi-turn conversation (ask follow-up questions)

---

## Updated Database Schema (AI Layer Additions)

```prisma
// Sprint 7.0 - AI Engine Foundation
model AiUsageLog {
  id           String   @id @default(uuid())
  tenantId     String
  feature      String
  template     String
  inputTokens  Int
  outputTokens Int
  costCents    Int
  latencyMs    Int
  success      Boolean
  createdAt    DateTime @default(now())
  @@index([tenantId, feature])
  @@index([createdAt])
}

model AiFeedback {
  id        String   @id @default(uuid())
  tenantId  String
  feature   String
  template  String
  aiOutput  String   @db.Text
  action    String   // ACCEPTED, EDITED, REJECTED
  humanEdit String?  @db.Text
  createdAt DateTime @default(now())
  @@index([tenantId, feature])
}

// Sprint 7.5 AI - Customer Health Score
// Add to existing Customer model:
// healthScore    Int    @default(50)    // 0-100 composite score
// churnRisk      Float  @default(0.0)   // 0.0-1.0 probability
// lifecycleStage String @default("new") // new, active, at_risk, dormant, lost

// Sprint 7.8 - Copilot
model CopilotConversation {
  id        String   @id @default(uuid())
  tenantId  String
  userId    String
  messages  Json     // Array of {role, content, toolCalls}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([tenantId, userId])
}

model WeeklyReport {
  id        String   @id @default(uuid())
  tenantId  String
  weekStart DateTime
  report    Json     // Structured report data
  sent      Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([tenantId, weekStart])
}
```

---

## Sprint Execution Order (Updated)

| Order | Sprint | Type | Dependencies |
|-------|--------|------|-------------|
| 1 | **7.0** | AI Engine Foundation | None — build first |
| 2 | **7.1** | Quote Follow-Up + AI Scoring | 7.0 |
| 3 | **7.2** | Payment Automation + AI Prediction | 7.0 |
| 4 | **7.3** | No-Show Prevention + AI Risk Scoring | 7.0, 7.2 (deposits) |
| 5 | **7.4** | Review Pipeline + AI Intelligence | 7.0 |
| 6 | **7.5** | Retention + AI Churn Prediction | 7.0 (needs health scores) |
| 7 | **7.6** | Dispatch + AI Duration/Upsell | 7.0 |
| 8 | **7.7** | AI Communication Brain | 7.0 |
| 9 | **7.8** | AI Business Copilot | 7.0, all other sprints (needs data) |

---

## Integration Test: Full AI-Powered Customer Lifecycle

1. Customer calls → **Vapi AI answers**, checks context, books appointment → **AI scores no-show risk** (Sprint 7.3 AI)
2. If high risk → **AI requires deposit** at booking (Sprint 7.2 AI) + **AI crafts personalized reminder** (Sprint 7.3 AI)
3. **AI predicts job duration** → optimizes technician route (Sprint 7.6 AI)
4. Technician arrives → **AI pushes upsell suggestions** to mobile (Sprint 7.6 AI)
5. Job complete → **NPS survey** → score 9 → **AI writes personalized review request** referencing the specific service (Sprint 7.4 AI)
6. Invoice sent → **AI predicts on-time payment** → calibrates reminder tone (Sprint 7.2 AI)
7. Owner asks copilot "How did Sarah's job go?" → **Copilot queries data, summarizes** (Sprint 7.8)
8. 60 days later → **AI detects declining health score** → triggers proactive win-back before 90-day dormancy (Sprint 7.5 AI)
9. Customer texts back → **AI auto-responds** with context from ALL prior interactions across voice/SMS/email (Sprint 7.7 AI)
10. Monday morning → **AI generates weekly report** with anomalies, action items, and forecasts (Sprint 7.8)
11. Quote sent → **AI scores conversion at 45%** → crafts personalized follow-up addressing predicted "price concern" → conversion (Sprint 7.1 AI)
