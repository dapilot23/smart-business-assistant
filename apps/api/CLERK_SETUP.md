# Clerk JWT Authentication Setup Guide

This guide covers the complete Clerk integration for JWT-based authentication with multi-tenant support.

## Overview

The NestJS backend now uses Clerk for authentication instead of traditional email/password. All endpoints are protected by default using the `ClerkAuthGuard`, which validates JWT tokens issued by Clerk.

## Architecture

```
┌─────────────┐      JWT Token       ┌──────────────┐
│   Frontend  │ ──────────────────> │   NestJS     │
│  (Clerk)    │                      │   Backend    │
└─────────────┘                      └──────────────┘
                                            │
                                            ├─ Verify JWT with Clerk
                                            ├─ Fetch user from Clerk API
                                            ├─ Sync to local database
                                            └─ Extract tenant context
```

## Files Created/Modified

### New Files
- `src/modules/auth/strategies/clerk.strategy.ts` - Clerk JWT verification strategy
- `src/common/guards/clerk-auth.guard.ts` - Guard for protecting routes
- `src/common/middleware/tenant-context.middleware.ts` - Extract tenant from user
- `src/config/clerk/clerk.service.ts` - Centralized Clerk client configuration
- `src/config/clerk/clerk.module.ts` - Global Clerk module
- `src/modules/auth/README.md` - Authentication documentation
- `prisma/migrations/20260123001400_add_clerk_integration/migration.sql` - Database migration

### Modified Files
- `prisma/schema.prisma` - Added `clerkId` field to User model
- `src/modules/auth/auth.module.ts` - Added ClerkStrategy
- `src/modules/auth/auth.service.ts` - Added `syncClerkUser()` method
- `src/modules/auth/auth.controller.ts` - Added `/auth/me` endpoint
- `src/common/decorators/current-user.decorator.ts` - Added `clerkId` field
- `src/app.module.ts` - Applied ClerkAuthGuard globally, added middleware
- `src/app.controller.ts` - Made health endpoint public

## Environment Variables

Required variables in `.env`:

```bash
# Clerk Authentication
CLERK_SECRET_KEY=sk_test_your_secret_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

Get these from: https://dashboard.clerk.com/

## Database Migration

Run the migration to add Clerk support:

```bash
# Apply migration (requires interactive mode or manual SQL execution)
# The migration file is already created at:
# prisma/migrations/20260123001400_add_clerk_integration/migration.sql

# Option 1: Run migration manually in PostgreSQL
psql -U sba_user -d smart_business_assistant -f prisma/migrations/20260123001400_add_clerk_integration/migration.sql

# Option 2: Use Prisma (in interactive environment)
pnpm prisma migrate deploy
```

Migration changes:
- Adds `clerkId` field (nullable, unique) to `users` table
- Makes `password` field nullable (for Clerk-only auth)
- Adds index on `clerkId` for performance

## Clerk Dashboard Configuration

### 1. Create Application
1. Go to https://dashboard.clerk.com/
2. Create a new application
3. Copy the Secret Key and Publishable Key

### 2. Configure User Metadata
For multi-tenancy, users must have `tenantId` in their public metadata:

**In Clerk Dashboard:**
1. Go to Users
2. Select a user
3. Edit "Public metadata"
4. Add:
```json
{
  "tenantId": "cuid_from_your_database",
  "role": "ADMIN"
}
```

### 3. Tenant Setup
Before adding users, create tenants in your database:

```sql
INSERT INTO tenants (id, name, email, phone)
VALUES ('cuid123', 'My Business', 'contact@mybusiness.com', '+1234567890');
```

Then use that `id` as the `tenantId` in Clerk user metadata.

## API Usage

### Protected Endpoint (default)
All endpoints are protected by default:

```typescript
@Get('customers')
async getCustomers(@CurrentUser() user: CurrentUserPayload) {
  // Automatically has: userId, tenantId, email, role, clerkId
  return this.customersService.findAll(user.tenantId);
}
```

### Public Endpoint
Use `@Public()` decorator to bypass authentication:

```typescript
@Public()
@Get('health')
async health() {
  return { status: 'ok' };
}
```

### Get Current User
```bash
curl -H "Authorization: Bearer <clerk_jwt_token>" \
  http://localhost:3001/api/v1/auth/me
```

Response:
```json
{
  "id": "cuid123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "ADMIN",
  "tenantId": "tenant_cuid",
  "clerkId": "user_2abc123",
  "tenant": {
    "id": "tenant_cuid",
    "name": "My Business",
    "email": "contact@mybusiness.com"
  }
}
```

## Testing

### 1. Local Testing with Clerk
```typescript
// In your test frontend or Postman
const clerkToken = await clerk.session.getToken();

fetch('http://localhost:3001/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  }
});
```

### 2. Manual Token Testing
1. Get JWT from Clerk frontend SDK
2. Use in Authorization header: `Bearer <token>`
3. Token is automatically verified and user synced

### 3. First-Time Login Flow
1. User authenticates via Clerk
2. Backend receives JWT
3. Backend verifies JWT with Clerk
4. Backend fetches user details from Clerk API
5. Backend checks if user exists (by `clerkId`)
6. If new user:
   - Extract `tenantId` from public metadata
   - Verify tenant exists in database
   - Create user record with `clerkId` link
7. Return user session

## Multi-Tenancy

### Tenant Isolation
The `TenantContextMiddleware` automatically extracts `tenantId` from the authenticated user and adds it to the request object. All service methods should use this for data isolation:

```typescript
@Get()
async findAll(@CurrentUser() user: CurrentUserPayload) {
  // All data automatically scoped to user's tenant
  return this.service.findAll(user.tenantId);
}
```

### Data Access Pattern
```typescript
// In service layer
async findAll(tenantId: string) {
  return this.prisma.customer.findMany({
    where: { tenantId }, // Ensures tenant isolation
  });
}
```

## Error Handling

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 401 | No token provided | Missing Authorization header | Add `Authorization: Bearer <token>` |
| 401 | Invalid token | Token expired or invalid | Re-authenticate with Clerk |
| 401 | Token validation failed | Clerk verification failed | Check Clerk keys in .env |
| 400 | User must be assigned to a tenant | No `tenantId` in Clerk metadata | Add tenantId to user in Clerk |
| 400 | Tenant not found | Invalid tenantId in metadata | Create tenant or fix metadata |

## Security Best Practices

1. **Never expose Clerk Secret Key** - Keep it in `.env`, never commit
2. **Validate tokens on every request** - Already handled by guard
3. **Use public metadata only for non-sensitive data** - tenantId and role are safe
4. **Implement rate limiting** - Consider per-tenant rate limits
5. **Monitor token verification failures** - Could indicate attack attempts
6. **Use HTTPS in production** - Never send tokens over HTTP

## Packages Installed

```bash
pnpm add @clerk/backend @clerk/clerk-sdk-node passport-custom
```

- `@clerk/backend` - Official Clerk SDK for token verification
- `@clerk/clerk-sdk-node` - Clerk client for user management (deprecated but still works)
- `passport-custom` - Custom passport strategy for Clerk

## Next Steps

1. **Run migration** - Apply database changes
2. **Update .env** - Add Clerk keys
3. **Create test tenant** - Insert a tenant record
4. **Configure Clerk user** - Add tenantId to metadata
5. **Test /auth/me endpoint** - Verify JWT flow works
6. **Update frontend** - Use Clerk React SDK to get tokens
7. **Test protected endpoints** - Ensure tenant isolation works

## Troubleshooting

### "Clerk not configured" error
- Check `CLERK_SECRET_KEY` is set in `.env`
- Restart server after updating `.env`

### "User must be assigned to a tenant"
- Add `tenantId` to user's public metadata in Clerk dashboard
- Format: `{"tenantId": "cuid_value"}`

### "Tenant not found"
- Ensure tenant exists in database
- Verify `tenantId` matches database value

### Token verification fails
- Check `CLERK_SECRET_KEY` matches dashboard
- Ensure token is not expired
- Verify token is from correct Clerk instance

### User not syncing to database
- Check database connection
- Verify Prisma client is generated
- Ensure migration was applied

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Backend SDK](https://clerk.com/docs/references/backend/overview)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [Passport Strategies](https://docs.nestjs.com/security/authentication)
