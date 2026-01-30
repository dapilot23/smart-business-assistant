# Operations Runbook

## Health Checks
- API: `GET /api/v1/health`
- Queue health: monitor Redis + BullMQ workers

## Common Tasks

### Restart Services
1. Stop API and worker processes.
2. Restart API (`pnpm -C apps/api start:prod`).
3. Restart web (`pnpm -C apps/web start`).

### Apply Migrations
1. Back up the database.
2. Run `pnpm -C apps/api prisma:migrate`.
3. Verify health checks and key workflows.

### Rollback a Release
1. Redeploy last known good artifact.
2. If migration is incompatible, restore from backup.

### Clear Stuck Jobs
1. Inspect BullMQ queues in Redis.
2. Remove or retry dead-letter jobs as needed.
3. Investigate failure root cause before re-queueing.

### Incident Triage
1. Check logs for request IDs and error stack traces.
2. Verify database/Redis connectivity.
3. Review recent deploys and migrations.
4. Roll back if required.

