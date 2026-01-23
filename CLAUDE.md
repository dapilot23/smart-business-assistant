# Project Guidelines

## Stack
- Use Playwright for all browser automation/testing
- Use Ralph for AI assistant development workflows
- Next.js 14 (App Router) + NestJS + Prisma + PostgreSQL
- Vapi.ai for voice, Twilio for SMS, Stripe for payments

## Development Rules
1. **Max 50 lines per function** - break larger logic into composable pieces
2. **Test-first**: Write failing test → implement → verify → commit
3. **Run tests after every change** - never proceed if tests fail
4. **One feature at a time** - complete and test before moving on

## Workflow
- Before writing implementation: write the test
- After each code block: run `npx playwright test` (or relevant command)
- If tests fail: fix immediately, don't accumulate debt
- Commit working states frequently

## Constraints
- No files over 200 lines
- No functions over 50 lines
- Each PR/change should be independently testable

## Testing Commands
- `pnpm test` - Run all tests
- `pnpm test:e2e` - Run Playwright E2E tests
- `pnpm test:unit` - Run unit tests

## Project Structure
```
smart-business-assistant/
├── apps/
│   ├── web/          # Next.js frontend + PWA
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared types, utils
└── CLAUDE.md         # This file
```

## Multi-Tenant Architecture
- All tables include `tenant_id` column
- PostgreSQL Row-Level Security (RLS) enforces isolation
- API middleware validates tenant context on every request

## External Services
| Service | Provider | Purpose |
|---------|----------|---------|
| Voice AI | Vapi.ai | AI phone call handling |
| SMS | Twilio | Text messaging |
| Payments | Stripe | Payment processing |
| Email | Resend | Transactional email |
| Auth | Clerk | Multi-tenant authentication |
