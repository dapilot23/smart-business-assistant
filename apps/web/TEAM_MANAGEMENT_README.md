# Team Management Feature

This document describes the team management feature implementation for the Smart Business Assistant application.

## Overview

The team management feature allows business owners and administrators to invite, manage, and organize team members with different roles and permissions.

## Features

### 1. Team Member Management
- View all team members with their details (name, email, role, status)
- Edit member roles
- Activate/deactivate members
- Remove members from the team
- Visual status indicators for easy identification

### 2. Invitation System
- Send email invitations to new team members
- Specify role during invitation
- Track pending invitations
- Resend expired or bounced invitations
- Cancel pending invitations
- Public invitation acceptance page

### 3. Role-Based Permissions
Four distinct roles with different access levels:
- **Owner**: Full system access, cannot be removed or edited
- **Admin**: Full access except billing, can manage team
- **Dispatcher**: Manage appointments and customer communications
- **Technician**: View and update assigned appointments only

### 4. Status Management
Three status types:
- **Active**: Full access to assigned features
- **Pending**: Invitation sent, waiting for acceptance
- **Deactivated**: Access revoked, can be reactivated

## File Structure

```
apps/web/
├── app/
│   ├── dashboard/
│   │   └── team/
│   │       └── page.tsx                    # Main team management page
│   └── invite/
│       └── [token]/
│           └── page.tsx                    # Public invitation acceptance page
├── components/
│   ├── team/
│   │   ├── team-member-list.tsx           # Table component for team members
│   │   ├── invite-member-modal.tsx        # Modal for inviting new members
│   │   ├── edit-member-modal.tsx          # Modal for editing member details
│   │   └── pending-invitations.tsx        # Component for pending invitations
│   └── ui/
│       ├── badge.tsx                       # Badge component (created)
│       └── table.tsx                       # Table component (created)
└── lib/
    ├── api/
    │   └── team.ts                         # API client functions
    └── types/
        └── team.ts                         # TypeScript types/interfaces
```

## Components

### Main Page: `app/dashboard/team/page.tsx`
**Purpose**: Main team management interface

**Features**:
- Lists all team members in a table
- Shows pending invitations section
- Displays role permission descriptions
- Handles all team member operations

**State Management**:
- `members`: Array of team members
- `invitations`: Array of pending invitations
- `selectedMember`: Currently selected member for editing
- `isInviteModalOpen`: Controls invite modal visibility
- `isEditModalOpen`: Controls edit modal visibility

**Usage**:
```typescript
// Accessible at /dashboard/team
// Auto-fetches data on mount
// Refreshes after any mutation
```

### TeamMemberList: `components/team/team-member-list.tsx`
**Purpose**: Display team members in a table format

**Props**:
```typescript
interface TeamMemberListProps {
  members: TeamMember[];
  onEdit: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
}
```

**Features**:
- Responsive table layout
- Color-coded role badges
- Status indicators
- Action buttons (edit, remove)
- Disabled actions for owner role

**Accessibility**:
- Semantic table structure
- Button titles for screen readers
- Keyboard navigation support

### InviteMemberModal: `components/team/invite-member-modal.tsx`
**Purpose**: Form to invite new team members

**Props**:
```typescript
interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

**Form Fields**:
- Email (required)
- Name (optional)
- Role selector (Admin, Dispatcher, Technician)

**Validation**:
- Email format validation
- Required field checking
- Role-specific permission descriptions

**Usage Example**:
```tsx
<InviteMemberModal
  open={isOpen}
  onOpenChange={setIsOpen}
  onSuccess={() => {
    // Refresh team data
    fetchTeamMembers();
  }}
/>
```

### EditMemberModal: `components/team/edit-member-modal.tsx`
**Purpose**: Edit existing team member details

**Props**:
```typescript
interface EditMemberModalProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

**Features**:
- Change member role
- Deactivate/reactivate member
- Confirmation dialogs for destructive actions
- Role permission descriptions

### PendingInvitations: `components/team/pending-invitations.tsx`
**Purpose**: Display and manage pending invitations

**Props**:
```typescript
interface PendingInvitationsProps {
  invitations: TeamInvitation[];
  onUpdate: () => void;
}
```

**Features**:
- Table of pending invitations
- Expiration status indicators
- Resend invitation action
- Cancel invitation action
- Loading states for actions

### Invitation Page: `app/invite/[token]/page.tsx`
**Purpose**: Public page for accepting team invitations

**Features**:
- Display invitation details (business, role, inviter)
- Expiration checking
- Redirect to Clerk signup
- Error handling for invalid/expired tokens

**Flow**:
1. User clicks invitation link in email
2. Page fetches invitation details via token
3. Shows invitation information
4. User clicks "Accept Invitation"
5. Redirects to Clerk signup with return URL
6. After signup, automatically joins team

## API Client: `lib/api/team.ts`

### Functions

#### `getTeamMembers(): Promise<TeamMember[]>`
Fetch all team members for the current organization.

#### `getTeamMember(id: string): Promise<TeamMember>`
Fetch a single team member by ID.

#### `updateTeamMember(id: string, data: UpdateTeamMemberData): Promise<TeamMember>`
Update a team member's role or status.

**Request Body**:
```typescript
{
  role?: 'admin' | 'dispatcher' | 'technician';
  status?: 'active' | 'pending' | 'deactivated';
}
```

#### `removeTeamMember(id: string): Promise<void>`
Remove a team member from the organization.

#### `inviteTeamMember(data: InviteTeamMemberData): Promise<TeamInvitation>`
Send an invitation to join the team.

**Request Body**:
```typescript
{
  email: string;
  name?: string;
  role: 'admin' | 'dispatcher' | 'technician';
}
```

#### `getInvitations(): Promise<TeamInvitation[]>`
Fetch all pending invitations.

#### `cancelInvitation(id: string): Promise<void>`
Cancel a pending invitation.

#### `resendInvitation(id: string): Promise<TeamInvitation>`
Resend an invitation email.

#### `getInvitationDetails(token: string): Promise<InvitationDetails>`
Fetch invitation details for public acceptance page (no auth required).

## Types: `lib/types/team.ts`

### TeamMember
```typescript
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  created_at: string;
  updated_at: string;
}
```

### TeamInvitation
```typescript
interface TeamInvitation {
  id: string;
  email: string;
  name?: string;
  role: TeamMemberRole;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by: string;
}
```

### InvitationDetails
```typescript
interface InvitationDetails {
  business_name: string;
  role: TeamMemberRole;
  invited_by: string;
  expires_at: string;
}
```

## Styling & Design

### Color Scheme
- **Owner Badge**: Primary color (blue)
- **Admin Badge**: Info color (blue-500)
- **Dispatcher Badge**: Secondary color (gray)
- **Technician Badge**: Success color (green-500)
- **Active Status**: Success (green)
- **Pending Status**: Warning (yellow)
- **Deactivated Status**: Destructive (red)

### Responsive Design
- Mobile-first approach
- Tables scroll horizontally on small screens
- Modals adapt to screen size
- Touch-friendly button sizes

### Accessibility
- Semantic HTML (table, form elements)
- ARIA labels where needed
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly status indicators

## Integration Points

### Backend API
Base URL: `process.env.NEXT_PUBLIC_API_URL`

Expected endpoints:
- `GET /team/members` - List members
- `GET /team/members/:id` - Get member
- `PATCH /team/members/:id` - Update member
- `DELETE /team/members/:id` - Remove member
- `POST /team/invitations` - Create invitation
- `GET /team/invitations` - List invitations
- `DELETE /team/invitations/:id` - Cancel invitation
- `POST /team/invitations/:id/resend` - Resend invitation
- `GET /team/invitations/:token/details` - Get invitation details (public)

### Authentication
- Uses Clerk for authentication
- API calls include auth headers automatically
- Invitation acceptance redirects to Clerk signup

### Email
Invitations trigger email notifications containing:
- Invitation link with token
- Business name
- Role assignment
- Invitation expiration date

## Usage Examples

### Inviting a Team Member
```typescript
// User clicks "Invite Team Member" button
<Button onClick={() => setIsInviteModalOpen(true)}>
  <UserPlus className="h-4 w-4 mr-2" />
  Invite Team Member
</Button>

// Modal opens, user fills form
// On submit, API call is made
await inviteTeamMember({
  email: 'new-member@example.com',
  name: 'John Doe',
  role: 'technician'
});

// Email sent to new-member@example.com
// Pending invitation appears in table
```

### Editing a Team Member
```typescript
// User clicks edit button on member row
<Button onClick={() => handleEdit(member)}>
  <Edit className="h-4 w-4" />
</Button>

// Modal opens with current member data
// User changes role from technician to dispatcher
await updateTeamMember(member.id, {
  role: 'dispatcher'
});

// Table refreshes with updated data
```

### Accepting an Invitation
```typescript
// User receives email, clicks invitation link
// Lands on /invite/abc123xyz

// Page fetches invitation details
const details = await getInvitationDetails('abc123xyz');

// Shows: "Acme Corp invites you as Technician"
// User clicks "Accept Invitation"
// Redirects to Clerk signup
router.push('/sign-up?redirect_url=/invite/abc123xyz/accept');

// After signup, backend processes invitation
// User added to team automatically
```

## Performance Considerations

### Optimizations
- Data fetched in parallel using `Promise.all`
- Loading states prevent multiple API calls
- Optimistic UI updates where appropriate
- Debounced search/filter (if implemented)

### Best Practices
- Components keep functions under 50 lines
- Reusable badge and status components
- Minimal re-renders through proper state management
- Error boundaries for resilience

## Testing Checklist

### Unit Tests
- [ ] Badge variants render correctly
- [ ] Table displays member data
- [ ] Form validation works
- [ ] API client handles errors

### Integration Tests
- [ ] Invite flow end-to-end
- [ ] Edit member updates data
- [ ] Remove member confirmation
- [ ] Invitation expiration logic

### E2E Tests
- [ ] Complete invitation acceptance flow
- [ ] Role changes reflect in UI
- [ ] Resend invitation works
- [ ] Cancel invitation removes from list

### Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Focus trapped in modals
- [ ] Color contrast meets WCAG AA

## Future Enhancements

### Potential Features
1. Bulk invite via CSV import
2. Team member search/filter
3. Activity log for team changes
4. Custom role creation
5. Permission granularity settings
6. Team member analytics
7. Invitation templates
8. Multi-language support

## Troubleshooting

### Common Issues

**Invitation link doesn't work**
- Check token hasn't expired
- Verify API endpoint is accessible
- Check CORS settings

**Can't remove team member**
- Ensure not trying to remove owner
- Check user has admin permissions
- Verify member ID is valid

**Email not received**
- Check spam folder
- Verify email service configuration
- Check API logs for send errors

**Modal doesn't close after success**
- Ensure `onSuccess` callback is called
- Check `onOpenChange` is properly wired
- Verify state updates trigger re-render

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001  # API base URL
```

## Summary

The team management feature provides a complete solution for:
- Inviting and managing team members
- Role-based access control
- Status tracking and management
- User-friendly invitation acceptance flow

All components are built with shadcn/ui for consistency, use Tailwind CSS for responsive design, and follow Next.js 14 App Router best practices.
