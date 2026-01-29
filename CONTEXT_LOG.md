# Smart Business Assistant - Context Log

This file tracks feature requests, architecture decisions, and implementation progress to maintain context across development sessions.

---

## Current Focus: Proactive AI Business Assistant

**Goal:** Transform the AI from a passive data viewer to a truly proactive assistant that takes action, offers suggestions everywhere, and works as an expert on behalf of the business owner.

---

## Feature Requests

### 1. Proactive AI Actions (Priority: HIGH)
**Status:** In Progress (Phase 1 Complete)
**Requested:** 2026-01-29

**Request:** The AI should be able to do much more. For instance, when there's no marketing campaign, it should create one and offer expert suggestions. This should be true in every part of the interface - a truly smart business assistant helping with everything and offering to do things proactively.

**Implementation:**
- [x] Action Engine - execute approved actions (campaigns, SMS, appointments)
- [ ] Contextual Suggestions - AI suggestions on every page
- [ ] Copilot Write Tools - chat can create things, not just read
- [ ] Event Triggers - proactive suggestions based on events

### 2. Marketing Module (Priority: HIGH)
**Status:** Complete (Backend) / In Progress (Frontend AI)
**Requested:** 2026-01-28

**Implementation:**
- [x] Campaigns service with create, schedule, send
- [x] Segments with rules engine
- [x] Referrals tracking
- [x] Marketing dashboard page
- [ ] AI-powered empty states
- [ ] Smart campaign suggestions

### 3. AI Specialist Agents (Priority: HIGH)
**Status:** Complete
**Requested:** 2026-01-27

**Implementation:**
- [x] Agent orchestrator
- [x] Revenue/Sales agent
- [x] Customer Success agent
- [x] Operations agent
- [x] Marketing agent
- [x] Insights dashboard panel
- [x] Action execution on approval

---

## Architecture Decisions

### AD-001: Action Engine Architecture
**Date:** 2026-01-29
**Decision:** Create a unified Action Engine that routes all AI-initiated actions through a single approval/execution pipeline.

**Rationale:**
- Consistent approval workflow for all action types
- Single point for logging, analytics, and auditing
- Easy to add new action types
- Clear separation between suggestion and execution

**Structure:**
```
AI Sources (Copilot, Agents, Suggestions)
           │
           ▼
    ┌─────────────┐
    │  AIAction   │  ← Database record
    │  (pending)  │
    └──────┬──────┘
           │ User approves
           ▼
    ┌─────────────┐
    │  Action     │  ← BullMQ processor
    │  Executor   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Services   │  ← CampaignsService, SmsService, etc.
    └─────────────┘
```

### AD-002: Contextual Suggestions per Page
**Date:** 2026-01-29
**Decision:** Each page requests suggestions using a context string (e.g., "marketing_empty") rather than a single global suggestions endpoint.

**Rationale:**
- More relevant suggestions based on what user is looking at
- Can cache per-context with different TTLs
- Reduces response size (only relevant suggestions)
- Context-aware AI prompts produce better results

---

## Implementation Notes

### Session: 2026-01-29 (Continued)

**Completed Today:**
1. Added business tips to InsightsPanel when no insights exist
2. Added Marketing section to sidebar navigation
3. Created Marketing dashboard page with campaigns, segments, referrals
4. Created marketing API client library
5. Fixed API client double JSON parsing bug
6. **Action Engine Phase 1:**
   - Added AIAction and ContextualSuggestion models to Prisma schema
   - Created ActionExecutorService with handlers for all 8 action types
   - Created BullMQ processor for async action execution
   - Created API endpoints for actions (create, list, approve, cancel)
   - Connected insight approval to action execution
   - Created frontend API client for actions

**New Files Created:**
- `apps/api/src/modules/ai-actions/action-executor.service.ts`
- `apps/api/src/modules/ai-actions/action.processor.ts`
- `apps/api/src/modules/ai-actions/ai-actions.controller.ts`
- `apps/api/src/modules/ai-actions/ai-actions.module.ts`
- `apps/web/lib/api/ai-actions.ts`

**Commits:**
- `ee481cf` - Add Marketing dashboard and improve AI Insights panel
- `526d5d1` - Add AI-powered agents and Marketing module (Phases 2-4)
- `33cfa04` - Add AI Specialist Agents foundation (Phase 1)

**Next Steps:**
1. Create Contextual Suggestions system
2. Add write tools to Copilot
3. Update Marketing empty state with AI suggestions
4. Add event-based proactive triggers

---

## User Feedback

### 2026-01-29
> "I see the AI insights area added to the dashboard but it says no pending insights. I would expect this always has something to tell me about the business or tips to offer. Also I dont see any marketing section"

**Resolution:** Added business tips fallback and Marketing section.

> "The AI should be able to do a lot more for me... I want a truly smart business assistant helping with everything and offering to do it for me proactively"

**Resolution:** Designing Proactive AI system (in progress).

---

## Technical Debt

1. **Webpack cache warning** - node-fetch resolution issue in Next.js dev mode (cosmetic, doesn't affect functionality)
2. **Demo mode auth** - Currently bypasses real authentication for testing

---

## Environment

- **Server:** 154.12.239.51
- **Frontend:** Port 3000
- **Backend:** Port 3001
- **Database:** PostgreSQL with Prisma
- **Queue:** Redis + BullMQ
