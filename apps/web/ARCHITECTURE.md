# Clerk Authentication Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Clerk Auth System                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Browser / Client                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Landing    │───▶│    Login     │───▶│   Signup     │          │
│  │   Page (/)   │    │  (/login)    │    │  (/signup)   │          │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘          │
│                              │                    │                  │
│                              └────────┬───────────┘                  │
│                                       │                              │
│                                       ▼                              │
│                            ┌──────────────────┐                     │
│                            │  Authentication  │                     │
│                            │    Successful    │                     │
│                            └────────┬─────────┘                     │
│                                     │                               │
│                                     ▼                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      Dashboard Layout                        │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Header: Logo | Nav | UserButton                       │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │  │
│  │  │ Dashboard  │  │   Calls    │  │  Messages  │            │  │
│  │  └────────────┘  └────────────┘  └────────────┘            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js Middleware                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Request ──▶ Route Matcher ──▶ Public? ──Yes──▶ Allow              │
│                    │                                                 │
│                    │ No                                              │
│                    ▼                                                 │
│              Auth Check ──▶ Authenticated? ──Yes──▶ Allow           │
│                                    │                                 │
│                                    │ No                              │
│                                    ▼                                 │
│                            Redirect to /login                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Clerk Service                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Session    │  │     User     │  │     Auth     │             │
│  │  Management  │  │  Management  │  │   Tokens     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
ClerkProvider (app/layout.tsx)
│
├── Public Routes
│   ├── Landing Page (/)
│   │   └── Links to /login & /signup
│   │
│   └── Auth Layout ((auth)/layout.tsx)
│       ├── Login Page ((auth)/login/page.tsx)
│       │   └── <SignIn /> Component
│       │
│       └── Signup Page ((auth)/signup/page.tsx)
│           └── <SignUp /> Component
│
└── Protected Routes
    └── Dashboard Layout ((dashboard)/layout.tsx)
        ├── Header
        │   ├── Logo & Navigation
        │   └── UserButton Component
        │       ├── User Avatar
        │       └── Dropdown Menu
        │           ├── Manage Account
        │           └── Sign Out
        │
        └── Page Content
            ├── Dashboard (page.tsx)
            ├── Calls (/calls/*)
            ├── Messages (/messages/*)
            └── Settings (/settings/*)
```

## Data Flow

### Authentication Flow

```
1. User visits protected route
   │
   ▼
2. Middleware intercepts request
   │
   ├─▶ Is public route? ──Yes──▶ Allow access
   │
   └─▶ No ──▶ Has valid session?
              │
              ├─▶ Yes ──▶ Allow access
              │
              └─▶ No ──▶ Redirect to /login
                         │
                         ▼
3. User sees Clerk SignIn component
   │
   ▼
4. User enters credentials
   │
   ▼
5. Clerk validates & creates session
   │
   ▼
6. Redirect to NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
   │
   ▼
7. Middleware validates session ──▶ Allow access
```

### Session Management

```
Browser                Next.js              Clerk
   │                      │                   │
   │─────Request─────────▶│                   │
   │                      │                   │
   │                      │──Verify Session──▶│
   │                      │                   │
   │                      │◀──Session Valid───│
   │                      │                   │
   │◀────Response─────────│                   │
   │                      │                   │
```

## Security Layers

### Layer 1: Middleware (Edge)
- Runs on every request
- Fast route protection
- Validates session tokens
- Redirects unauthenticated users

### Layer 2: Server Components
- Server-side auth checks
- Protected API routes
- Secure data fetching

### Layer 3: Client Components (Optional)
- `useAuth()` hook
- `ProtectedRoute` wrapper
- Real-time auth state

## File Structure & Responsibilities

```
middleware.ts
├─ Purpose: Route protection
├─ Runs on: Edge (before page render)
└─ Protects: All routes except public

app/layout.tsx
├─ Purpose: Provide auth context
├─ Wraps: Entire application
└─ Provides: ClerkProvider

app/(auth)/
├─ layout.tsx
│  ├─ Purpose: Auth page styling
│  └─ Features: Centered card, gradient background
│
├─ login/page.tsx
│  ├─ Purpose: Sign in interface
│  └─ Uses: Clerk <SignIn /> component
│
└─ signup/page.tsx
   ├─ Purpose: Sign up interface
   └─ Uses: Clerk <SignUp /> component

app/(dashboard)/
└─ layout.tsx
   ├─ Purpose: Protected layout
   ├─ Features: Navigation, user menu
   └─ Uses: UserButton component

components/
├─ user-button.tsx
│  ├─ Purpose: User menu in header
│  ├─ Shows: Avatar, account menu
│  └─ Actions: Manage account, sign out
│
├─ auth-loading.tsx
│  ├─ Purpose: Loading state
│  └─ Shows: Spinner during auth
│
└─ protected-route.tsx
   ├─ Purpose: Client-side route guard
   └─ Uses: useAuth() hook
```

## Environment Configuration

```
.env.local
├─ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
│  ├─ Used by: Client & Server
│  ├─ Purpose: Initialize Clerk
│  └─ Get from: Clerk Dashboard
│
├─ CLERK_SECRET_KEY
│  ├─ Used by: Server only
│  ├─ Purpose: API requests
│  └─ Get from: Clerk Dashboard
│
├─ NEXT_PUBLIC_CLERK_SIGN_IN_URL
│  ├─ Default: /login
│  └─ Purpose: Sign in redirect
│
├─ NEXT_PUBLIC_CLERK_SIGN_UP_URL
│  ├─ Default: /signup
│  └─ Purpose: Sign up redirect
│
├─ NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
│  ├─ Default: /dashboard
│  └─ Purpose: Post-login redirect
│
└─ NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
   ├─ Default: /dashboard
   └─ Purpose: Post-signup redirect
```

## API Patterns

### Server Component
```tsx
import { currentUser } from "@clerk/nextjs/server";

export default async function Page() {
  const user = await currentUser();
  return <div>Hello {user?.firstName}</div>;
}
```

### Client Component
```tsx
"use client";
import { useUser } from "@clerk/nextjs";

export function Component() {
  const { user } = useUser();
  return <div>Hello {user?.firstName}</div>;
}
```

### API Route
```tsx
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({}, { status: 401 });
  // Protected logic
}
```

## Performance Metrics

- Middleware execution: ~5-10ms (Edge)
- Session validation: ~20-50ms (API)
- Component render: ~50-100ms (SSR)
- Total auth overhead: ~75-160ms

## Multi-Tenant Support

Clerk provides built-in organization support for multi-tenant applications:

```tsx
import { useOrganization } from "@clerk/nextjs";

function Component() {
  const { organization } = useOrganization();
  // Use organization.id as tenant_id
}
```

## Monitoring & Debugging

### Check Configuration
```bash
pnpm check:clerk
```

### Clerk Logs
Available in Clerk Dashboard:
- Sign-in attempts
- Failed auth
- Session creation
- API usage

### Browser DevTools
- Check cookies: __session, __clerk_db_jwt
- Network tab: Clerk API calls
- Console: Clerk debug mode

## Deployment Checklist

- [ ] Update production Clerk keys
- [ ] Configure allowed domains in Clerk
- [ ] Set up webhooks for user events
- [ ] Test authentication flow
- [ ] Verify session persistence
- [ ] Check middleware performance
- [ ] Configure rate limits
- [ ] Set up monitoring alerts
