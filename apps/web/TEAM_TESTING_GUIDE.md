# Team Management - Testing Guide

## Manual Testing Checklist

### 1. Team Members List

#### Display Tests
- [ ] Navigate to `/dashboard/team`
- [ ] Verify team members table displays with columns: Name, Email, Role, Status, Actions
- [ ] Verify role badges show correct colors:
  - Owner: Primary (blue)
  - Admin: Info (blue-500)
  - Dispatcher: Secondary (gray)
  - Technician: Success (green)
- [ ] Verify status badges show correct colors:
  - Active: Success (green)
  - Pending: Warning (yellow)
  - Deactivated: Destructive (red)
- [ ] Verify empty state shows when no members exist

#### Action Tests
- [ ] Click edit button on a member (not owner)
- [ ] Verify edit modal opens
- [ ] Verify edit button is disabled for owner role
- [ ] Click remove button on a member (not owner)
- [ ] Verify confirmation dialog appears
- [ ] Verify remove button is disabled for owner role

### 2. Invite Team Member

#### Modal Display
- [ ] Click "Invite Team Member" button
- [ ] Verify modal opens with title "Invite Team Member"
- [ ] Verify form fields are present:
  - Email (required, with icon)
  - Name (optional, with icon)
  - Role selector (required)

#### Form Validation
- [ ] Try to submit with empty email
- [ ] Verify error appears
- [ ] Enter invalid email format
- [ ] Verify browser validation
- [ ] Select each role option
- [ ] Verify role description updates

#### Successful Invite
- [ ] Fill in valid email: `test@example.com`
- [ ] Enter name: `Test User`
- [ ] Select role: `Technician`
- [ ] Click "Send Invitation"
- [ ] Verify loading state shows "Sending..."
- [ ] Verify modal closes on success
- [ ] Verify new invitation appears in pending section

#### Error Handling
- [ ] Invite same email twice
- [ ] Verify error message displays
- [ ] Verify modal stays open
- [ ] Click Cancel
- [ ] Verify modal closes without saving

### 3. Edit Team Member

#### Modal Display
- [ ] Click edit on any active member
- [ ] Verify modal shows member email (read-only)
- [ ] Verify current role is selected
- [ ] Verify status management section appears

#### Role Update
- [ ] Change role from Technician to Dispatcher
- [ ] Verify role description updates
- [ ] Click "Update Role"
- [ ] Verify loading state
- [ ] Verify modal closes
- [ ] Verify table updates with new role
- [ ] Verify badge color changes

#### Status Management
- [ ] For active member, verify "Deactivate Member" button shows
- [ ] Click "Deactivate Member"
- [ ] Verify confirmation prompt
- [ ] Confirm deactivation
- [ ] Verify status changes to "Deactivated"
- [ ] Edit same member again
- [ ] Verify "Reactivate Member" button shows
- [ ] Click to reactivate
- [ ] Verify status changes back to "Active"

#### Cancel Edit
- [ ] Open edit modal
- [ ] Make changes
- [ ] Click "Cancel"
- [ ] Verify modal closes
- [ ] Verify changes not saved

### 4. Pending Invitations

#### Display Tests
- [ ] Verify "Pending Invitations" card appears when invitations exist
- [ ] Verify table shows: Email, Name, Role, Expires, Actions
- [ ] Verify role badge displays correctly
- [ ] For non-expired: Verify expiration date shows
- [ ] For expired: Verify "Expired" badge shows

#### Resend Action
- [ ] Click resend button (paper plane icon)
- [ ] Verify loading state on that button only
- [ ] Verify success (invitation updated or confirmation)
- [ ] Verify other actions still work

#### Cancel Action
- [ ] Click cancel button (X icon)
- [ ] Verify confirmation dialog appears
- [ ] Confirm cancellation
- [ ] Verify invitation removed from table
- [ ] If last invitation, verify card disappears

### 5. Remove Team Member

#### Confirmation Flow
- [ ] Click remove button on a member
- [ ] Verify confirmation dialog with member name
- [ ] Click Cancel
- [ ] Verify member not removed
- [ ] Click remove again
- [ ] Confirm removal
- [ ] Verify member removed from table

#### Permission Tests
- [ ] Verify cannot remove owner
- [ ] Verify remove button disabled for owner

### 6. Invitation Acceptance Page

#### Valid Invitation
- [ ] Navigate to `/invite/[valid-token]`
- [ ] Verify invitation details display:
  - Business name
  - Role with badge
  - Invited by name
  - Expiration date
- [ ] Verify "Accept Invitation" button shows
- [ ] Click "Accept Invitation"
- [ ] Verify redirect to Clerk signup

#### Expired Invitation
- [ ] Navigate to `/invite/[expired-token]`
- [ ] Verify error message shows
- [ ] Verify details about expiration
- [ ] Verify "Return to Home" button shows

#### Invalid Token
- [ ] Navigate to `/invite/invalid-token`
- [ ] Verify error message shows
- [ ] Verify "Invalid Invitation" title
- [ ] Verify "Return to Home" button

### 7. Responsive Design

#### Desktop (1920px)
- [ ] Verify table displays all columns
- [ ] Verify modal is centered
- [ ] Verify proper spacing

#### Tablet (768px)
- [ ] Verify table scrolls horizontally if needed
- [ ] Verify modal adapts to width
- [ ] Verify buttons stack properly

#### Mobile (375px)
- [ ] Verify table scrolls horizontally
- [ ] Verify modal takes full width with padding
- [ ] Verify buttons stack vertically in modals
- [ ] Verify touch targets are adequate (44x44px minimum)

### 8. Accessibility

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Verify focus indicators visible
- [ ] Press Enter on "Invite Member" button
- [ ] Verify modal opens and focus trapped
- [ ] Press Escape
- [ ] Verify modal closes
- [ ] Tab to edit button and press Enter
- [ ] Verify edit modal opens

#### Screen Reader
- [ ] Use screen reader to navigate team table
- [ ] Verify table headers announced
- [ ] Verify badge content announced
- [ ] Navigate to action buttons
- [ ] Verify button titles announced
- [ ] Open modal
- [ ] Verify modal title and description announced

#### Color Contrast
- [ ] Use contrast checker on all badge variants
- [ ] Verify minimum 4.5:1 for text
- [ ] Verify 3:1 for UI components

### 9. Error States

#### Network Errors
- [ ] Disconnect network
- [ ] Try to load team page
- [ ] Verify error message displays
- [ ] Try to invite member
- [ ] Verify error message in modal

#### API Errors
- [ ] Simulate 401 error (unauthorized)
- [ ] Verify redirect to login
- [ ] Simulate 403 error (forbidden)
- [ ] Verify permission error message
- [ ] Simulate 500 error (server error)
- [ ] Verify generic error message

### 10. Loading States

#### Initial Load
- [ ] Navigate to team page
- [ ] Verify spinner shows while loading
- [ ] Verify "Loading..." text or icon
- [ ] Wait for data
- [ ] Verify smooth transition to content

#### Action Loading
- [ ] Click any action button
- [ ] Verify button shows loading state
- [ ] Verify button is disabled during load
- [ ] Verify other buttons remain enabled

### 11. Role Permission Descriptions

#### Display
- [ ] Scroll to bottom of team page
- [ ] Verify "Role Permissions" card shows
- [ ] Verify all four roles listed:
  - Owner with description
  - Admin with description
  - Dispatcher with description
  - Technician with description
- [ ] Verify badges match role list badges

#### Modal Descriptions
- [ ] Open invite modal
- [ ] Select each role
- [ ] Verify description updates below selector
- [ ] Open edit modal
- [ ] Select each role
- [ ] Verify description updates

## Automated Testing Suggestions

### Unit Tests (Jest + React Testing Library)

```typescript
// TeamMemberList.test.tsx
describe('TeamMemberList', () => {
  it('renders members correctly', () => {});
  it('shows empty state when no members', () => {});
  it('calls onEdit when edit clicked', () => {});
  it('calls onRemove when remove clicked', () => {});
  it('disables actions for owner role', () => {});
});

// InviteMemberModal.test.tsx
describe('InviteMemberModal', () => {
  it('validates email field', () => {});
  it('submits form with valid data', () => {});
  it('shows loading state', () => {});
  it('displays error message', () => {});
  it('resets form on success', () => {});
});

// EditMemberModal.test.tsx
describe('EditMemberModal', () => {
  it('loads member data', () => {});
  it('updates role', () => {});
  it('deactivates member', () => {});
  it('reactivates member', () => {});
});
```

### Integration Tests (Playwright)

```typescript
// team.spec.ts
test.describe('Team Management', () => {
  test('complete invite flow', async ({ page }) => {
    await page.goto('/dashboard/team');
    await page.click('text=Invite Team Member');
    await page.fill('[name=email]', 'new@example.com');
    await page.selectOption('[name=role]', 'technician');
    await page.click('text=Send Invitation');
    await expect(page.locator('text=new@example.com')).toBeVisible();
  });

  test('edit member role', async ({ page }) => {
    // Test implementation
  });

  test('remove member', async ({ page }) => {
    // Test implementation
  });
});
```

### E2E Tests

```typescript
// invitation-acceptance.spec.ts
test.describe('Invitation Acceptance', () => {
  test('accept valid invitation', async ({ page }) => {
    const token = 'valid-test-token';
    await page.goto(`/invite/${token}`);
    await expect(page.locator('text=Team Invitation')).toBeVisible();
    await page.click('text=Accept Invitation');
    await expect(page.url()).toContain('/sign-up');
  });

  test('show error for expired invitation', async ({ page }) => {
    const token = 'expired-test-token';
    await page.goto(`/invite/${token}`);
    await expect(page.locator('text=Invalid Invitation')).toBeVisible();
  });
});
```

## Performance Testing

### Metrics to Monitor
- [ ] Initial page load < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] Modal open/close < 200ms
- [ ] API calls < 1 second
- [ ] Table render with 100 members < 500ms

### Tools
- Lighthouse for performance audit
- Chrome DevTools Performance tab
- React DevTools Profiler

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Common Issues & Solutions

### Issue: Modal doesn't close
**Solution**: Check `onOpenChange` callback is properly connected

### Issue: Table data doesn't refresh
**Solution**: Ensure `onSuccess` callbacks trigger `fetchData()`

### Issue: Icons not showing
**Solution**: Verify Icon component has all required icon types

### Issue: Styles not applying
**Solution**: Check Tailwind classes are valid and not purged

### Issue: API calls fail
**Solution**: Verify `NEXT_PUBLIC_API_URL` is set in `.env.local`

## Testing Commands

```bash
# Run all tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run specific test file
pnpm test team.test.tsx

# Run tests in watch mode
pnpm test --watch

# Generate coverage report
pnpm test --coverage
```

## Definition of Done

A feature is considered complete when:
- [ ] All manual tests pass
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Accessibility tests passing
- [ ] Performance metrics met
- [ ] Works on all supported browsers
- [ ] Responsive on all screen sizes
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] No console errors or warnings
