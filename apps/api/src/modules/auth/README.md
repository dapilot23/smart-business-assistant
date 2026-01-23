# Clerk Authentication Integration

This module provides Clerk JWT authentication for the NestJS backend with multi-tenant support.

## Architecture

### Flow
1. User authenticates via Clerk on the frontend
2. Frontend receives JWT token from Clerk
3. Frontend sends JWT in `Authorization: Bearer <token>` header
4. Backend validates JWT using Clerk's verification
5. Backend syncs user to local database (first-time login)
6. Backend extracts tenant context from Clerk metadata
7. All subsequent requests include tenant isolation

### Key Components

**Strategies**
- `ClerkStrategy` - Validates Clerk JWT tokens and syncs users

**Guards**
- `ClerkAuthGuard` - Applied globally, respects `@Public()` decorator

**Decorators**
- `@CurrentUser()` - Extracts user info from request
- `@Public()` - Marks endpoints as publicly accessible

**Middleware**
- `TenantContextMiddleware` - Extracts tenantId from authenticated user

**Services**
- `AuthService.syncClerkUser()` - Creates local user on first login

## Usage

### Protected Endpoint (default)
```typescript
@Get('customers')
async getCustomers(@CurrentUser() user: CurrentUserPayload) {
  // user.tenantId automatically isolated
  return this.customersService.findAll(user.tenantId);
}
```

### Public Endpoint
```typescript
@Public()
@Get('health')
async health() {
  return { status: 'ok' };
}
```

### Get Current User Info
```typescript
@Get('me')
async me(@CurrentUser() user: CurrentUserPayload) {
  return {
    id: user.userId,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
  };
}
```

## Multi-Tenancy Setup

### Clerk Configuration
Users must have `tenantId` in their public metadata:

```json
{
  "publicMetadata": {
    "tenantId": "cuid_value",
    "role": "ADMIN"
  }
}
```

### First-Time User Sync
When a user logs in for the first time:
1. Clerk JWT is validated
2. User data is fetched from Clerk API
3. `tenantId` is extracted from public metadata
4. Local user record is created with `clerkId` link
5. User is associated with existing tenant

If tenant doesn't exist or user has no `tenantId` in metadata:
- Request fails with 400 Bad Request
- Admin must assign user to tenant in Clerk dashboard

## Environment Variables

Required in `.env`:
```bash
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Database Schema

The User model includes:
- `clerkId` - Unique identifier linking to Clerk user
- `password` - Optional (null for Clerk-only auth)
- `tenantId` - Required for multi-tenant isolation

## API Endpoints

### GET /api/v1/auth/me
Returns current authenticated user

**Headers:**
```
Authorization: Bearer <clerk_jwt>
```

**Response:**
```json
{
  "id": "cuid123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "ADMIN",
  "tenantId": "tenant_cuid",
  "clerkId": "user_clerk_id",
  "tenant": {
    "id": "tenant_cuid",
    "name": "My Business"
  }
}
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired JWT | Re-authenticate via Clerk |
| 400 Bad Request | No tenantId in metadata | Assign user to tenant in Clerk |
| 400 Bad Request | Tenant not found | Create tenant first |

## Security Considerations

1. **JWT Verification**: Tokens verified using Clerk's official SDK
2. **Tenant Isolation**: All queries automatically scoped to user's tenant
3. **Public Metadata**: Only use public metadata for non-sensitive data
4. **Rate Limiting**: Consider implementing rate limiting per tenant
5. **Webhook Validation**: Future: validate Clerk webhooks for user updates

## Testing

To test authentication locally:

1. Set up Clerk application with test keys
2. Create a tenant in database
3. Create Clerk user with matching tenantId in metadata
4. Use Clerk's frontend SDK to get JWT
5. Send requests with JWT in Authorization header

## Migration Notes

Migration `20260123001400_add_clerk_integration` adds:
- `clerkId` field (unique, nullable)
- Makes `password` nullable (for Clerk-only auth)
- Adds index on `clerkId` for performance
