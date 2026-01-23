# Clerk Integration - Implementation Checklist

Use this checklist to verify and deploy the Clerk authentication integration.

## Pre-Deployment Checks

### 1. Dependencies Installed ✅
```bash
# Verify packages are installed
grep -E "@clerk/backend|@clerk/clerk-sdk-node|passport-custom" package.json
```

Expected output should show:
- `@clerk/backend`
- `@clerk/clerk-sdk-node`
- `passport-custom`

### 2. Database Schema Updated ✅
```bash
# Check schema includes clerkId
grep "clerkId" prisma/schema.prisma
```

Expected: `clerkId   String?  @unique`

### 3. Prisma Client Generated ✅
```bash
pnpm prisma generate
```

Should complete without errors.

### 4. Project Builds Successfully ✅
```bash
pnpm build
```

Should complete without TypeScript errors.

## Deployment Steps

### Step 1: Set Up Clerk Application

- [ ] Go to https://dashboard.clerk.com/
- [ ] Create new application or select existing
- [ ] Copy **Secret Key** (starts with `sk_`)
- [ ] Copy **Publishable Key** (starts with `pk_`)

### Step 2: Configure Environment

- [ ] Add to `.env`:
  ```bash
  CLERK_SECRET_KEY=sk_test_your_actual_key_here
  CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
  ```
- [ ] Verify keys are correct (no placeholder values)
- [ ] Optional: Run validation script:
  ```bash
  ts-node src/scripts/validate-clerk-config.ts
  ```

### Step 3: Apply Database Migration

Choose one option:

**Option A: Manual SQL Execution**
```bash
psql -U sba_user -d smart_business_assistant \
  -f prisma/migrations/20260123001400_add_clerk_integration/migration.sql
```

**Option B: Prisma Deploy (requires interactive mode)**
```bash
# Only works in interactive environment
pnpm prisma migrate deploy
```

Verify migration:
```sql
-- Check that clerkId column exists
\d users
```

Should show `clerkId | text | | |`

### Step 4: Create Test Tenant

```sql
-- Connect to database
psql -U sba_user -d smart_business_assistant

-- Create tenant
INSERT INTO tenants (id, name, email, phone, created_at, updated_at)
VALUES (
  'tenant_test_123',
  'Test Business',
  'test@example.com',
  '+1234567890',
  NOW(),
  NOW()
);

-- Verify
SELECT id, name, email FROM tenants;
```

Copy the tenant `id` for next step.

### Step 5: Configure Clerk User

- [ ] Go to Clerk Dashboard → Users
- [ ] Create test user or select existing
- [ ] Click on user → Edit
- [ ] Under "Public metadata", add:
  ```json
  {
    "tenantId": "tenant_test_123",
    "role": "ADMIN"
  }
  ```
  (Replace `tenant_test_123` with actual tenant ID from Step 4)
- [ ] Save changes

### Step 6: Start Server

```bash
# Development mode
pnpm dev

# Or production build
pnpm build
pnpm start:prod
```

Server should start on port 3001 without errors.

### Step 7: Test Health Endpoint (Public)

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-23T..."
}
```

### Step 8: Get Clerk JWT Token

**Option A: From Frontend**
```javascript
// In your React app with Clerk SDK
import { useAuth } from '@clerk/clerk-react';

const { getToken } = useAuth();
const token = await getToken();
console.log('JWT Token:', token);
```

**Option B: From Clerk Dashboard**
- Go to Users → Select user → Sessions
- Copy active session token

### Step 9: Test Protected Endpoint

```bash
# Replace <YOUR_TOKEN> with actual JWT from Step 8
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:3001/api/v1/auth/me
```

Expected response:
```json
{
  "id": "cuid_...",
  "email": "test@example.com",
  "name": "Test User",
  "role": "ADMIN",
  "tenantId": "tenant_test_123",
  "clerkId": "user_...",
  "tenant": {
    "id": "tenant_test_123",
    "name": "Test Business",
    "email": "test@example.com"
  }
}
```

### Step 10: Verify User Sync

```sql
-- Check user was created in database
SELECT id, email, name, clerk_id, tenant_id FROM users;
```

Should show user with populated `clerk_id` field.

### Step 11: Test Tenant Isolation

```bash
# Test getting tenant-specific data
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:3001/api/v1/customers
```

Should only return customers for user's tenant.

## Troubleshooting

### Issue: "Clerk not configured"
- ✓ Check `.env` has correct keys
- ✓ Restart server after updating `.env`
- ✓ Verify keys start with `sk_` and `pk_`

### Issue: "User must be assigned to a tenant"
- ✓ Add `tenantId` to user's public metadata in Clerk
- ✓ Verify tenant ID exists in database
- ✓ Check metadata format is correct JSON

### Issue: "Token validation failed"
- ✓ Token might be expired - get new one
- ✓ Check `CLERK_SECRET_KEY` matches dashboard
- ✓ Verify not using test key in production

### Issue: User not syncing to database
- ✓ Check migration was applied
- ✓ Verify database connection
- ✓ Check server logs for errors
- ✓ Ensure Prisma client is generated

### Issue: 401 Unauthorized on all endpoints
- ✓ Add `Authorization: Bearer <token>` header
- ✓ Check token is valid (not expired)
- ✓ Verify endpoint is not marked `@Public()`

## Production Deployment

### Additional Steps for Production

1. **Use Production Clerk Keys**
   ```bash
   CLERK_SECRET_KEY=sk_live_...
   CLERK_PUBLISHABLE_KEY=pk_live_...
   ```

2. **Enable HTTPS**
   - Configure reverse proxy (nginx/caddy)
   - Get SSL certificate
   - Update CORS settings

3. **Configure CORS**
   ```typescript
   // In main.ts
   app.enableCors({
     origin: process.env.FRONTEND_URL,
     credentials: true,
   });
   ```

4. **Set Up Monitoring**
   - Monitor failed token verifications
   - Track user sync errors
   - Alert on unusual tenant access patterns

5. **Rate Limiting**
   - Consider implementing rate limits per tenant
   - Protect against token abuse

6. **Backup Strategy**
   - Regular database backups
   - Include user-tenant mappings

## Verification Checklist

After deployment, verify:

- [ ] Health endpoint accessible without auth
- [ ] Protected endpoints require valid JWT
- [ ] Invalid tokens return 401
- [ ] User synced on first login
- [ ] Tenant isolation working
- [ ] `/auth/me` returns correct user data
- [ ] Frontend can authenticate and make requests
- [ ] Multiple users in same tenant see same data
- [ ] Users in different tenants see isolated data
- [ ] Public endpoints still accessible

## Rollback Plan

If issues occur:

1. **Revert to old auth** (if necessary):
   ```bash
   git revert <commit_hash>
   ```

2. **Remove global guard**:
   - Comment out APP_GUARD in `app.module.ts`
   - Use `@UseGuards(ClerkAuthGuard)` selectively

3. **Database rollback**:
   ```sql
   ALTER TABLE users DROP COLUMN clerk_id;
   ALTER TABLE users ALTER COLUMN password SET NOT NULL;
   ```

## Success Criteria

Implementation is successful when:

✅ Server builds and starts without errors
✅ Health endpoint accessible (public)
✅ JWT tokens verified correctly
✅ Users synced to database on first login
✅ Tenant isolation working
✅ All existing endpoints protected
✅ Frontend can authenticate and make requests

## Next Steps After Deployment

1. Update frontend to use Clerk React SDK
2. Implement role-based access control
3. Add webhook handlers for user updates
4. Set up monitoring and alerting
5. Document frontend integration
6. Train team on new auth flow

## Support

- Review `CLERK_SETUP.md` for detailed setup guide
- Check `src/modules/auth/README.md` for API usage
- See `QUICK_REFERENCE.md` for developer patterns
- Consult `CLERK_INTEGRATION_SUMMARY.md` for architecture

## Maintenance

Regular tasks:

- Monitor Clerk API usage and quotas
- Review failed authentication attempts
- Update Clerk SDK versions quarterly
- Audit user-tenant assignments
- Review and rotate API keys if compromised
