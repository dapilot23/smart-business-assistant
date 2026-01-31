# Launch Checklist

## 1) Infrastructure + Environment
- [ ] Postgres reachable and `DATABASE_URL` set
- [ ] Redis reachable and configured
- [ ] Clerk keys set (publishable + secret)
- [ ] Stripe keys + webhook secret set
- [ ] Twilio SID/token/number set
- [ ] Resend API key + from email set
- [ ] Vapi API key set (if voice is enabled)
- [ ] Google Calendar OAuth credentials set

## 2) Database + Migrations
- [ ] Run `pnpm --filter api prisma:generate`
- [ ] Run `pnpm --filter api prisma:migrate`
- [ ] Verify agent_settings has `autopilotMode` + `maxDiscountPercent`

## 3) Seed + Admin Access
- [ ] Seed a demo tenant (if needed)
- [ ] Create owner/admin user in Clerk
- [ ] Confirm tenant and user mapping is working

## 4) Core Workflows (Smoke)
- [ ] Open Today page and see AI actions
- [ ] Run “Run AI now” and confirm actions update
- [ ] Approve/Skip an AI action (verify status changes)
- [ ] Inbox loads conversations and can send a reply
- [ ] Autopilot mode changes persist
- [ ] Discount guardrail enforces approval for > max

## 5) Security + Guardrails
- [ ] Verify agent settings are tenant-scoped
- [ ] Review discount guardrail threshold
- [ ] Confirm AI actions cannot execute without approval when required

## 6) Observability
- [ ] Logs shipping
- [ ] Error alerts (API + Web)
- [ ] Queue worker healthy

## 7) Rollout
- [ ] Deploy API
- [ ] Deploy Web
- [ ] Run smoke check in production
- [ ] Enable autopilot for first tenant
