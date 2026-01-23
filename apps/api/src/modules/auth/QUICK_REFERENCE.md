# Clerk Authentication - Quick Reference

One-page reference for developers using Clerk authentication.

## Making Requests

```bash
# All requests need Authorization header with Clerk JWT
curl -H "Authorization: Bearer <clerk_jwt_token>" \
  http://localhost:3001/api/v1/customers
```

## Controller Patterns

### Protected Endpoint (default)
```typescript
@Get('resources')
async getResources(@CurrentUser() user: CurrentUserPayload) {
  return this.service.findAll(user.tenantId);
}
```

### Public Endpoint
```typescript
@Public()
@Get('status')
getStatus() {
  return { status: 'ok' };
}
```

### Get Specific User Field
```typescript
@Post('items')
async createItem(
  @Body() data: CreateItemDto,
  @CurrentUser('tenantId') tenantId: string,
) {
  return this.service.create(data, tenantId);
}
```

## CurrentUser Interface

```typescript
interface CurrentUserPayload {
  userId: string;      // Local database user ID
  tenantId: string;    // Tenant ID for data isolation
  email: string;       // User email from Clerk
  role: string;        // User role (ADMIN or USER)
  clerkId?: string;    // Clerk user ID
}
```

## Service Patterns

### Tenant-Scoped Query
```typescript
async findAll(tenantId: string) {
  return this.prisma.resource.findMany({
    where: { tenantId },
  });
}
```

### Tenant-Scoped Create
```typescript
async create(data: CreateDto, tenantId: string) {
  return this.prisma.resource.create({
    data: {
      ...data,
      tenantId,
    },
  });
}
```

### Verify Tenant Access
```typescript
async findOne(id: string, tenantId: string) {
  const resource = await this.prisma.resource.findUnique({
    where: { id },
  });

  if (!resource) {
    throw new NotFoundException('Resource not found');
  }

  if (resource.tenantId !== tenantId) {
    throw new ForbiddenException('Access denied');
  }

  return resource;
}
```

## Environment Setup

```bash
# .env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Clerk User Metadata

Set in Clerk dashboard for each user:
```json
{
  "tenantId": "cuid_from_database",
  "role": "ADMIN"
}
```

## Common Errors

| Error | Fix |
|-------|-----|
| 401 Unauthorized | Add `Authorization: Bearer <token>` header |
| "No tenantId" | Add tenantId to Clerk user metadata |
| "Tenant not found" | Create tenant in database first |

## Testing Locally

1. Get JWT from Clerk frontend:
   ```javascript
   const token = await clerk.session.getToken();
   ```

2. Use in API requests:
   ```javascript
   fetch('/api/v1/resource', {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   ```

## First-Time Setup

1. Add Clerk keys to `.env`
2. Run migration: `pnpm prisma migrate deploy`
3. Create tenant in database
4. Add tenantId to Clerk user metadata
5. Test `/auth/me` endpoint

## Key Files

- `src/modules/auth/strategies/clerk.strategy.ts` - JWT verification
- `src/common/guards/clerk-auth.guard.ts` - Route protection
- `src/common/decorators/current-user.decorator.ts` - User extraction
- `src/modules/auth/auth.service.ts` - User sync logic

## Tips

✅ All endpoints protected by default
✅ Use `@Public()` to bypass auth
✅ Always scope queries by tenantId
✅ User synced automatically on first login
✅ Tenant isolation enforced at service layer
