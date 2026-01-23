# Team Management - Quick Reference Card

## Common Operations

### Invite a Team Member
```typescript
import { inviteTeamMember } from '@/lib/api/team';

await inviteTeamMember({
  email: 'user@example.com',
  name: 'John Doe', // optional
  role: 'technician' // 'admin' | 'dispatcher' | 'technician'
});
```

### Update Member Role
```typescript
import { updateTeamMember } from '@/lib/api/team';

await updateTeamMember('member-id', {
  role: 'admin'
});
```

### Deactivate Member
```typescript
await updateTeamMember('member-id', {
  status: 'deactivated'
});
```

### Remove Member
```typescript
import { removeTeamMember } from '@/lib/api/team';

await removeTeamMember('member-id');
```

## Component Usage

### TeamMemberList
```tsx
import { TeamMemberList } from '@/components/team/team-member-list';

<TeamMemberList
  members={members}
  onEdit={(member) => {
    setSelectedMember(member);
    setIsEditModalOpen(true);
  }}
  onRemove={async (member) => {
    if (confirm(`Remove ${member.name}?`)) {
      await removeTeamMember(member.id);
      await fetchData();
    }
  }}
/>
```

### InviteMemberModal
```tsx
import { InviteMemberModal } from '@/components/team/invite-member-modal';

<InviteMemberModal
  open={isOpen}
  onOpenChange={setIsOpen}
  onSuccess={() => fetchData()}
/>
```

### EditMemberModal
```tsx
import { EditMemberModal } from '@/components/team/edit-member-modal';

<EditMemberModal
  member={selectedMember}
  open={isOpen}
  onOpenChange={setIsOpen}
  onSuccess={() => fetchData()}
/>
```

### PendingInvitations
```tsx
import { PendingInvitations } from '@/components/team/pending-invitations';

<PendingInvitations
  invitations={invitations}
  onUpdate={() => fetchData()}
/>
```

## Badge Variants

### Role Badges
```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">Owner</Badge>      // Primary blue
<Badge variant="info">Admin</Badge>         // Info blue
<Badge variant="secondary">Dispatcher</Badge> // Gray
<Badge variant="success">Technician</Badge> // Green
```

### Status Badges
```tsx
<Badge variant="success">Active</Badge>      // Green
<Badge variant="warning">Pending</Badge>     // Yellow
<Badge variant="destructive">Deactivated</Badge> // Red
```

## Type Definitions

### TeamMember
```typescript
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'dispatcher' | 'technician';
  status: 'active' | 'pending' | 'deactivated';
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

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/team/members` | List all members |
| GET | `/team/members/:id` | Get one member |
| PATCH | `/team/members/:id` | Update member |
| DELETE | `/team/members/:id` | Remove member |
| POST | `/team/invitations` | Create invitation |
| GET | `/team/invitations` | List invitations |
| DELETE | `/team/invitations/:id` | Cancel invitation |
| POST | `/team/invitations/:id/resend` | Resend invitation |
| GET | `/team/invitations/:token/details` | Get details (public) |

## URLs

| Path | Purpose |
|------|---------|
| `/dashboard/team` | Team management page |
| `/invite/[token]` | Invitation acceptance |

## Role Permissions

| Role | Permissions |
|------|-------------|
| Owner | Full access, cannot be edited/removed |
| Admin | Full access except billing, can manage team |
| Dispatcher | Manage appointments, customer communications |
| Technician | View and update assigned appointments |

## Icons Used

```typescript
import {
  UserPlus,    // Invite button
  Users,       // Team section
  Edit,        // Edit action
  Trash2,      // Remove action
  Send,        // Resend invitation
  Mail,        // Email/invitation
  Loader2,     // Loading state
  Building2,   // Organization
  UserCheck,   // Role/member
} from 'lucide-react';
```

## Common Patterns

### Fetch Data Pattern
```typescript
const fetchData = async () => {
  setIsLoading(true);
  setError('');
  try {
    const [membersData, invitationsData] = await Promise.all([
      getTeamMembers(),
      getInvitations(),
    ]);
    setMembers(membersData);
    setInvitations(invitationsData);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Error Handling Pattern
```typescript
try {
  await inviteTeamMember(data);
  onSuccess();
} catch (err) {
  setError(err instanceof Error ? err.message : 'Failed');
}
```

### Confirmation Pattern
```typescript
const handleRemove = async (member: TeamMember) => {
  if (!confirm(`Remove ${member.name}?`)) return;

  try {
    await removeTeamMember(member.id);
    await fetchData();
  } catch (err) {
    alert(err.message);
  }
};
```

## Styling Classes

### Container
```tsx
className="max-w-6xl mx-auto space-y-6"
```

### Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Button Variants
```tsx
<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="destructive">Danger</Button>
<Button size="sm">Small</Button>
<Button size="icon">Icon Only</Button>
```

### Modal Structure
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      {/* Form fields */}
    </div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button type="submit">Submit</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Troubleshooting

### "Cannot find module" error
```bash
# Restart dev server
pnpm dev
```

### Types not updating
```bash
# Clear .next cache
rm -rf .next
pnpm dev
```

### Styles not applying
```bash
# Rebuild Tailwind
pnpm build
```

### API calls failing
1. Check `NEXT_PUBLIC_API_URL` is set
2. Verify backend is running
3. Check browser console for CORS errors
4. Verify auth token is included

## File Locations

```
Component Files:
├── /app/dashboard/team/page.tsx
├── /app/invite/[token]/page.tsx
├── /components/team/team-member-list.tsx
├── /components/team/invite-member-modal.tsx
├── /components/team/edit-member-modal.tsx
└── /components/team/pending-invitations.tsx

API & Types:
├── /lib/api/team.ts
└── /lib/types/team.ts

UI Components:
├── /components/ui/badge.tsx
└── /components/ui/table.tsx

Documentation:
├── TEAM_MANAGEMENT_README.md
├── TEAM_FILES_SUMMARY.md
├── TEAM_TESTING_GUIDE.md
└── TEAM_QUICK_REFERENCE.md
```

## Testing Commands

```bash
# Manual test in browser
pnpm dev
# Visit: http://localhost:3000/dashboard/team

# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run specific test
pnpm test team.test.tsx
```

## Code Standards

### Function Length
- Maximum 50 lines per function
- Break complex logic into smaller functions

### File Length
- Maximum 200 lines per file
- Split large components into smaller ones

### Naming Conventions
- Components: PascalCase (TeamMemberList)
- Functions: camelCase (fetchTeamMembers)
- Types: PascalCase (TeamMember)
- Constants: UPPER_SNAKE_CASE (API_URL)

### Import Order
1. React imports
2. Third-party libraries
3. Internal components
4. Utils and helpers
5. Types
6. Styles

## Performance Tips

### Optimize Re-renders
```typescript
// Use callback refs
const handleEdit = useCallback((member) => {
  setSelectedMember(member);
  setIsEditModalOpen(true);
}, []);

// Memoize expensive computations
const sortedMembers = useMemo(
  () => members.sort((a, b) => a.name.localeCompare(b.name)),
  [members]
);
```

### Lazy Load Modals
```typescript
const EditModal = lazy(() => import('./edit-member-modal'));
```

### Debounce API Calls
```typescript
const debouncedSearch = useMemo(
  () => debounce((query) => searchMembers(query), 300),
  []
);
```

## Accessibility Checklist

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels on icon buttons
- [ ] Form labels associated
- [ ] Error messages announced
- [ ] Loading states announced
- [ ] Modal focus trapped
- [ ] Color contrast meets WCAG AA

## Support Resources

- Full Documentation: `TEAM_MANAGEMENT_README.md`
- File List: `TEAM_FILES_SUMMARY.md`
- Testing Guide: `TEAM_TESTING_GUIDE.md`
- This Reference: `TEAM_QUICK_REFERENCE.md`
