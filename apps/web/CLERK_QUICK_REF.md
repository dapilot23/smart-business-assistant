# Clerk Authentication Quick Reference

## File Structure
```
/home/ubuntu/smart-business-assistant/apps/web/
├── middleware.ts                    # Route protection
├── app/
│   ├── layout.tsx                  # ClerkProvider wrapper
│   ├── (auth)/
│   │   ├── layout.tsx             # Auth page layout
│   │   ├── login/page.tsx         # Sign in
│   │   └── signup/page.tsx        # Sign up
│   └── (dashboard)/
│       └── layout.tsx             # Protected layout with UserButton
└── components/
    ├── user-button.tsx            # User menu
    ├── auth-loading.tsx           # Loading spinner
    └── protected-route.tsx        # Client-side route guard
```

## Key Components

### UserButton
```tsx
import { UserButton } from "@/components/user-button";

<UserButton />
```

### ProtectedRoute (optional)
```tsx
import { ProtectedRoute } from "@/components/protected-route";

<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>
```

### Auth Hooks
```tsx
import { useAuth, useUser } from "@clerk/nextjs";

// In client components
const { isLoaded, isSignedIn, userId } = useAuth();
const { user } = useUser();

// User properties
user?.firstName
user?.lastName
user?.emailAddresses[0].emailAddress
user?.imageUrl
```

### Server-Side Auth
```tsx
import { auth, currentUser } from "@clerk/nextjs/server";

// In Server Components or API routes
const { userId } = await auth();
const user = await currentUser();
```

## Environment Variables
```bash
# Required
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Already configured
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Route Protection

### Middleware (automatic)
```ts
// Already configured in middleware.ts
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/api/webhooks(.*)',
]);
```

### Adding Protected Routes
Just create them under `/app/(dashboard)/` - they're automatically protected.

### Adding Public Routes
Update `middleware.ts` to add to the `isPublicRoute` matcher.

## Customization

### Clerk Component Styling
```tsx
<SignIn
  appearance={{
    elements: {
      rootBox: "w-full",
      card: "shadow-lg",
      headerTitle: "text-2xl",
      // ... more customization
    },
  }}
/>
```

### User Button Customization
```tsx
<UserButton
  appearance={{
    elements: {
      avatarBox: "w-10 h-10",
      userButtonPopoverCard: "shadow-xl",
    },
  }}
  afterSignOutUrl="/login"
  showName={true}
/>
```

## Common Patterns

### Get Current User in Server Component
```tsx
import { currentUser } from "@clerk/nextjs/server";

export default async function ProfilePage() {
  const user = await currentUser();

  return <div>Welcome {user?.firstName}</div>;
}
```

### Protect API Route
```tsx
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Your API logic
}
```

### Check Auth in Client Component
```tsx
"use client";
import { useAuth } from "@clerk/nextjs";

export function MyComponent() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <div>Please sign in</div>;

  return <div>User ID: {userId}</div>;
}
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Run E2E tests
pnpm test:e2e

# Run auth tests specifically
pnpm test:e2e tests/e2e/auth.spec.ts
```

## Troubleshooting

### Build fails with "invalid publishableKey"
- Update `.env.local` with real Clerk keys
- Get keys from https://dashboard.clerk.com

### Redirect loop
- Check middleware.ts public routes
- Verify NEXT_PUBLIC_CLERK_SIGN_IN_URL is set

### User button not showing
- Ensure component is in a Client Component
- Check that user is authenticated
- Verify Clerk keys are correct

### Session not persisting
- Clear browser cookies
- Check that domain matches in Clerk dashboard
- Verify middleware is running

## Resources

- [Clerk Docs](https://clerk.com/docs)
- [Next.js Guide](https://clerk.com/docs/quickstarts/nextjs)
- [API Reference](https://clerk.com/docs/references/nextjs/overview)
- [Dashboard](https://dashboard.clerk.com)
