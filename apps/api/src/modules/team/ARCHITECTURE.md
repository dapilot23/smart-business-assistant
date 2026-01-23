# Team Management Module Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Web App / Mobile App / External Services)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    TeamController                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ GET    /team                    - List members             │ │
│  │ GET    /team/invitations        - List invitations         │ │
│  │ GET    /team/:id                - Get member               │ │
│  │ PATCH  /team/:id                - Update member            │ │
│  │ DELETE /team/:id                - Remove member            │ │
│  │ POST   /team/invite             - Invite member            │ │
│  │ DELETE /team/invitations/:id    - Cancel invitation        │ │
│  │ POST   /team/invitations/:id... - Resend invitation        │ │
│  │ POST   /team/accept-invitation  - Accept invitation (pub)  │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Method Calls
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      TeamService                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Business Logic & Validation                               │ │
│  │  ├─ Tenant isolation checks                                │ │
│  │  ├─ Duplicate prevention                                   │ │
│  │  ├─ Token generation (crypto.randomBytes)                  │ │
│  │  ├─ Expiry calculation (7 days)                            │ │
│  │  └─ Status management                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────┬─────────────────────────────┬────────────────────┘
              │                             │
              │                             │
┌─────────────▼─────────────┐  ┌───────────▼────────────────────┐
│    PrismaService          │  │     EmailService                │
│  ┌─────────────────────┐  │  │  ┌───────────────────────────┐ │
│  │ Database Operations │  │  │  │ Send invitation emails    │ │
│  │ ├─ User CRUD        │  │  │  │ (Currently logs to        │ │
│  │ ├─ Invitation CRUD  │  │  │  │  console - Resend later) │ │
│  │ └─ Tenant queries   │  │  │  └───────────────────────────┘ │
│  └─────────────────────┘  │  └────────────────────────────────┘
└─────────────┬─────────────┘
              │
              │ SQL Queries
              │
┌─────────────▼─────────────────────────────────────────────────┐
│                    PostgreSQL Database                         │
│  ┌──────────────────┐  ┌──────────────────────────────────┐  │
│  │  users           │  │  team_invitations                │  │
│  │  ├─ id           │  │  ├─ id                           │  │
│  │  ├─ email        │  │  ├─ email                        │  │
│  │  ├─ name         │  │  ├─ name                         │  │
│  │  ├─ role         │  │  ├─ role                         │  │
│  │  ├─ status       │  │  ├─ status                       │  │
│  │  ├─ tenantId     │  │  ├─ token (unique, 64 chars)    │  │
│  │  ├─ clerkId      │  │  ├─ tenantId                     │  │
│  │  ├─ invitedBy    │  │  ├─ invitedBy                    │  │
│  │  └─ joinedAt     │  │  └─ expiresAt (7 days)          │  │
│  └──────────────────┘  └──────────────────────────────────┘  │
│                                                                 │
│  Row-Level Security enforces tenant isolation                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Invite Team Member Flow

```
┌─────────┐                ┌──────────────┐              ┌──────────┐
│ Admin   │                │ TeamService  │              │ Database │
└────┬────┘                └──────┬───────┘              └─────┬────┘
     │                            │                            │
     │ POST /team/invite          │                            │
     │ {email, name, role}        │                            │
     ├───────────────────────────>│                            │
     │                            │                            │
     │                            │ Check existing user        │
     │                            ├───────────────────────────>│
     │                            │                            │
     │                            │ Check pending invitation   │
     │                            ├───────────────────────────>│
     │                            │                            │
     │                            │ Generate token (32 bytes)  │
     │                            │ Calculate expiry (+7 days) │
     │                            │                            │
     │                            │ Create invitation          │
     │                            ├───────────────────────────>│
     │                            │                            │
     │                            │ Send email notification    │
     │                            │ (EmailService)             │
     │                            │                            │
     │     Return invitation      │                            │
     │<───────────────────────────┤                            │
     │                            │                            │
```

### 2. Accept Invitation Flow

```
┌─────────┐           ┌──────────────┐           ┌──────────┐
│ New User│           │ TeamService  │           │ Database │
└────┬────┘           └──────┬───────┘           └─────┬────┘
     │                       │                         │
     │ POST /accept-invitation                        │
     │ {token, clerkId}      │                         │
     ├──────────────────────>│                         │
     │                       │                         │
     │                       │ Find invitation by token│
     │                       ├────────────────────────>│
     │                       │                         │
     │                       │ Validate status=PENDING │
     │                       │ Validate not expired    │
     │                       │                         │
     │                       │ Create User record      │
     │                       ├────────────────────────>│
     │                       │   status: ACTIVE        │
     │                       │   joinedAt: now()       │
     │                       │                         │
     │                       │ Update invitation       │
     │                       ├────────────────────────>│
     │                       │   status: ACCEPTED      │
     │                       │                         │
     │  Return user & tenant │                         │
     │<──────────────────────┤                         │
     │                       │                         │
```

### 3. Remove Team Member Flow

```
┌─────────┐           ┌──────────────┐           ┌──────────┐
│ Admin   │           │ TeamService  │           │ Database │
└────┬────┘           └──────┬───────┘           └─────┬────┘
     │                       │                         │
     │ DELETE /team/:id      │                         │
     ├──────────────────────>│                         │
     │                       │                         │
     │                       │ Verify tenant ownership │
     │                       ├────────────────────────>│
     │                       │                         │
     │                       │ Update user             │
     │                       ├────────────────────────>│
     │                       │ SET status=DEACTIVATED  │
     │                       │ (Soft delete)           │
     │                       │                         │
     │  Return updated user  │                         │
     │<──────────────────────┤                         │
     │                       │                         │
```

## State Machine: Invitation Lifecycle

```
     [CREATE]
        │
        ▼
   ┌──────────┐
   │ PENDING  │◄─────────────┐
   └─────┬────┘              │
         │                   │ [RESEND]
         │                   │ - New token
         │                   │ - New expiry
         ├───────────────────┘
         │
         │
    ┌────┼────┬──────────┐
    │    │    │          │
    ▼    ▼    ▼          ▼
┌─────┐ ┌───┐ ┌────┐ ┌────────┐
│ACCEP│ │EXP│ │CANC│ │PENDING │
│TED  │ │IRE│ │ELLE│ │(resent)│
└─────┘ └──D┘ └D───┘ └────────┘
(Final) (Fi) (Fina)
        nal)  l)

Transitions:
- PENDING → ACCEPTED: User clicks link, provides clerkId
- PENDING → EXPIRED:  7 days pass without acceptance
- PENDING → CANCELLED: Admin cancels invitation
- PENDING → PENDING:  Admin resends (new token/expiry)
```

## State Machine: User Status

```
     [INVITE]
        │
        ▼
   ┌──────────┐    [ACCEPT]      ┌────────┐
   │ PENDING  ├─────────────────>│ ACTIVE │
   └──────────┘                   └────┬───┘
                                       │
                                       │ [DEACTIVATE]
                                       │
                                       ▼
                                  ┌─────────────┐
                                  │ DEACTIVATED │
                                  └─────────────┘

States:
- PENDING:     Invited, waiting to join
- ACTIVE:      Active team member
- DEACTIVATED: Removed from team (soft delete)
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ClerkAuthGuard (except accept-invitation endpoint)     │
│     └─ Validates JWT token                                 │
│     └─ Extracts user ID and tenant ID                      │
│                                                             │
│  2. TenantContextMiddleware                                │
│     └─ Injects tenantId into request                       │
│     └─ All queries scoped to tenant                        │
│                                                             │
│  3. Service-Level Validation                               │
│     └─ Verifies resource belongs to tenant                 │
│     └─ Checks for duplicates                               │
│     └─ Validates token expiry                              │
│                                                             │
│  4. Token Generation                                       │
│     └─ crypto.randomBytes(32) → 64 hex chars               │
│     └─ Cryptographically secure                            │
│                                                             │
│  5. Database Constraints                                   │
│     └─ Unique email per tenant                             │
│     └─ Unique tokens                                       │
│     └─ Foreign key cascade deletes                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | NestJS | Modular TypeScript backend framework |
| Validation | class-validator | DTO validation with decorators |
| Database | PostgreSQL + Prisma | Type-safe database access |
| Auth | Clerk | Authentication & user management |
| Email | Resend | Transactional emails (to be implemented) |
| Security | crypto (Node.js) | Token generation |

## Scaling Considerations

### Horizontal Scaling
- **Stateless Design**: Service has no in-memory state
- **Database Connection Pooling**: Prisma handles connection management
- **Multi-Tenant Isolation**: All queries include tenantId filter

### Performance Optimizations
1. **Database Indexes**:
   - `users.tenantId` - Fast tenant filtering
   - `users.clerkId` - Fast auth lookups
   - `users.status` - Filter active users
   - `team_invitations.token` - Fast token lookups
   - `team_invitations.tenantId` - Fast tenant filtering

2. **Query Optimization**:
   - Select only required fields
   - Avoid N+1 queries with includes
   - Filter at database level

3. **Caching Opportunities** (Future):
   - Cache active team members by tenant
   - Cache user permissions
   - TTL: 5-15 minutes

### Bottlenecks & Solutions

| Bottleneck | Impact | Solution |
|------------|--------|----------|
| Email delivery | Slow invitation flow | Queue email jobs (Bull/BullMQ) |
| Token validation | High read load | Redis cache for valid tokens |
| Large teams | Slow list queries | Pagination + cursor-based |
| Concurrent invites | Duplicate prevention | Database unique constraints |

## API Rate Limiting (Recommended)

```typescript
// Future implementation
@Throttle(10, 60) // 10 requests per minute
async inviteTeamMember() { ... }

@Throttle(3, 60) // 3 resends per minute
async resendInvitation() { ... }
```

## Monitoring & Observability

### Key Metrics
- Invitation acceptance rate
- Time to accept invitation
- Failed invitation attempts
- Active team members per tenant
- Deactivation frequency

### Logging
- All invitation creates/resends (INFO)
- Acceptance events (INFO)
- Failed validations (WARN)
- Security violations (ERROR)

## Future Enhancements

1. **Email Templates**: Rich HTML emails with branding
2. **Bulk Invitations**: CSV upload for multiple invites
3. **Role Permissions**: Fine-grained permission matrix
4. **Audit Trail**: Track all team changes
5. **Custom Expiry**: Per-invitation expiry periods
6. **Invitation Links**: Direct link generation
7. **Two-Factor Auth**: Optional 2FA for sensitive roles
8. **Team Hierarchy**: Reporting structure
9. **Activity Tracking**: Last login, activity metrics
10. **Notifications**: Slack/email for team events
