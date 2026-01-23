# Team Management Module

The Team Management module provides comprehensive functionality for managing team members, roles, and invitations in a multi-tenant environment.

## Features

- Multi-tenant team member management
- Role-based access control (OWNER, ADMIN, DISPATCHER, TECHNICIAN)
- Secure invitation system with token-based acceptance
- Email notifications for invitations
- 7-day invitation expiry
- Status tracking (PENDING, ACTIVE, DEACTIVATED)

## Architecture

```
team/
├── dto/
│   ├── accept-invitation.dto.ts    # DTO for accepting invitations
│   ├── invite-team-member.dto.ts   # DTO for creating invitations
│   └── update-team-member.dto.ts   # DTO for updating members
├── team.controller.ts              # REST API endpoints
├── team.service.ts                 # Business logic
├── team.module.ts                  # Module configuration
└── index.ts                        # Barrel exports
```

## API Endpoints

### Team Members

#### GET /team
List all active team members for the tenant.

**Response:**
```json
[
  {
    "id": "user_123",
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "TECHNICIAN",
    "status": "ACTIVE",
    "joinedAt": "2024-01-15T10:00:00Z",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

#### GET /team/:id
Get a single team member by ID.

**Response:**
```json
{
  "id": "user_123",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "TECHNICIAN",
  "status": "ACTIVE"
}
```

#### PATCH /team/:id
Update a team member's role or status.

**Request Body:**
```json
{
  "role": "DISPATCHER",
  "status": "ACTIVE"
}
```

#### DELETE /team/:id
Deactivate a team member (soft delete).

**Response:**
```json
{
  "id": "user_123",
  "email": "john@example.com",
  "name": "John Doe",
  "status": "DEACTIVATED"
}
```

### Invitations

#### POST /team/invite
Send an invitation to a new team member.

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "name": "Jane Smith",
  "role": "TECHNICIAN"
}
```

**Response:**
```json
{
  "id": "inv_123",
  "email": "newmember@example.com",
  "name": "Jane Smith",
  "role": "TECHNICIAN",
  "status": "PENDING",
  "token": "abc123...",
  "expiresAt": "2024-01-22T10:00:00Z",
  "invitedBy": "user_456",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### GET /team/invitations
List all pending invitations that haven't expired.

**Response:**
```json
[
  {
    "id": "inv_123",
    "email": "newmember@example.com",
    "name": "Jane Smith",
    "role": "TECHNICIAN",
    "status": "PENDING",
    "expiresAt": "2024-01-22T10:00:00Z",
    "invitedBy": "user_456",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

#### DELETE /team/invitations/:id
Cancel a pending invitation.

**Response:**
```json
{
  "id": "inv_123",
  "status": "CANCELLED"
}
```

#### POST /team/invitations/:id/resend
Resend an invitation email with a new token and expiry date.

**Response:**
```json
{
  "id": "inv_123",
  "token": "new_token_xyz...",
  "expiresAt": "2024-01-29T10:00:00Z"
}
```

#### POST /team/accept-invitation (Public)
Accept an invitation and create a user account.

**Request Body:**
```json
{
  "token": "abc123...",
  "clerkId": "clerk_user_123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_789",
    "email": "newmember@example.com",
    "name": "Jane Smith",
    "role": "TECHNICIAN",
    "status": "ACTIVE",
    "tenantId": "tenant_123"
  },
  "tenant": {
    "id": "tenant_123",
    "name": "ABC Services",
    "slug": "abc-services"
  }
}
```

## User Roles

| Role | Description |
|------|-------------|
| OWNER | Business owner with full access to all features |
| ADMIN | Administrative access, can manage team and settings |
| DISPATCHER | Can manage appointments and customers |
| TECHNICIAN | Field worker with limited access |

## User Status

| Status | Description |
|--------|-------------|
| PENDING | Invited but not yet joined |
| ACTIVE | Active team member |
| DEACTIVATED | Removed from team (soft delete) |

## Invitation Status

| Status | Description |
|--------|-------------|
| PENDING | Invitation sent, awaiting acceptance |
| ACCEPTED | User accepted and account created |
| EXPIRED | Invitation expired (7 days) |
| CANCELLED | Invitation cancelled by team admin |

## Security Features

1. **Secure Tokens**: Generated using `crypto.randomBytes(32)` for 64-character hex tokens
2. **Expiry**: Invitations expire after 7 days
3. **Tenant Isolation**: All operations are scoped to the requesting tenant
4. **Role Validation**: Uses enum validation for roles and statuses
5. **Duplicate Prevention**: Checks for existing users and pending invitations

## Service Methods

### TeamService

- `getTeamMembers(tenantId)` - List all active team members
- `getTeamMember(tenantId, userId)` - Get single member with tenant verification
- `updateTeamMember(tenantId, userId, data)` - Update role/status
- `removeTeamMember(tenantId, userId)` - Soft delete (deactivate)
- `inviteTeamMember(tenantId, data, invitedBy)` - Create invitation and send email
- `getInvitations(tenantId)` - List pending non-expired invitations
- `cancelInvitation(tenantId, invitationId)` - Cancel invitation
- `acceptInvitation(token, clerkId)` - Accept invitation and create user
- `resendInvitation(tenantId, invitationId)` - Generate new token and resend

## Dependencies

- **PrismaModule**: Database access
- **EmailModule**: Email notifications (currently logs to console)
- **ClerkAuthGuard**: Authentication (bypassed for public endpoints)

## Database Models

### User
```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  name      String
  role      UserRole   @default(TECHNICIAN)
  status    UserStatus @default(ACTIVE)
  tenantId  String
  clerkId   String?    @unique
  invitedBy String?
  joinedAt  DateTime?
}
```

### TeamInvitation
```prisma
model TeamInvitation {
  id        String           @id @default(cuid())
  email     String
  name      String?
  role      UserRole         @default(TECHNICIAN)
  tenantId  String
  token     String           @unique
  status    InvitationStatus @default(PENDING)
  expiresAt DateTime
  invitedBy String
}
```

## Error Handling

The service throws appropriate exceptions:

- `NotFoundException`: Resource not found
- `ForbiddenException`: Access denied (tenant mismatch)
- `ConflictException`: Duplicate user or invitation
- `BadRequestException`: Invalid operation (e.g., accepting expired invitation)

## Usage Example

```typescript
import { TeamService } from './modules/team';

// Inject in your service/controller
constructor(private readonly teamService: TeamService) {}

// List team members
const members = await this.teamService.getTeamMembers('tenant_123');

// Invite new member
const invitation = await this.teamService.inviteTeamMember(
  'tenant_123',
  {
    email: 'newuser@example.com',
    name: 'New User',
    role: 'TECHNICIAN',
  },
  'user_456', // invitedBy
);

// Accept invitation (from public endpoint)
const result = await this.teamService.acceptInvitation(
  'token_abc123',
  'clerk_user_789',
);
```

## Future Enhancements

1. Implement actual email sending via EmailService
2. Add permission checks based on user roles
3. Add audit logging for team changes
4. Support for bulk invitations
5. Custom invitation expiry periods
6. Role-specific permission matrix
