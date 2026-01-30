# Deployment Guide

## Environments
- **staging**: pre-production validation
- **production**: live traffic

## Required Services
- PostgreSQL (primary database)
- Redis (queue + cache)
- Object storage (S3-compatible)
- Resend (email)
- Twilio (SMS)
- Stripe (payments)
- Vapi (voice)

## Environment Variables
Create per-environment `.env` files or secret manager entries. Required:
- `DATABASE_URL`
- `REDIS_URL`
- `CLERK_SECRET_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VAPI_API_KEY`
- `VAPI_WEBHOOK_SECRET`
- `API_BASE_URL`
- `FRONTEND_URL`

## Deploy Steps
1. **Build**: `pnpm -r build`
2. **Migrate**: `pnpm -C apps/api prisma:migrate`
3. **Seed (optional)**: `pnpm -C apps/api prisma:seed`
4. **Start API**: `pnpm -C apps/api start:prod`
5. **Start Web**: `pnpm -C apps/web start`

## Rollback
1. Revert to the previous release artifact.
2. If schema migrations were applied, follow the migration rollback checklist in `docs/RUNBOOK.md`.

