# Clerk Authentication Code Snippets

Quick copy-paste snippets for common Clerk authentication patterns.

## File Locations

All files are in: `/home/ubuntu/smart-business-assistant/apps/web/`

## Core Implementation Files

### middleware.ts (Route Protection)
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### app/layout.tsx (ClerkProvider)
```typescript
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### app/(auth)/layout.tsx (Auth Pages Layout)
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Smart Business Assistant
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-powered business automation
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### app/(auth)/login/page.tsx (Sign In Page)
```typescript
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center p-8">
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none",
          },
        }}
      />
    </div>
  );
}
```

### app/(auth)/signup/page.tsx (Sign Up Page)
```typescript
import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center p-8">
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none",
          },
        }}
      />
    </div>
  );
}
```

### components/user-button.tsx (User Menu)
```typescript
"use client";

import { UserButton as ClerkUserButton } from "@clerk/nextjs";

export function UserButton() {
  return (
    <ClerkUserButton
      appearance={{
        elements: {
          avatarBox: "w-9 h-9",
          userButtonPopoverCard: "shadow-lg",
        },
      }}
      afterSignOutUrl="/login"
      showName={false}
    />
  );
}
```

## Usage Patterns

### Get Current User (Server Component)
```typescript
import { currentUser } from "@clerk/nextjs/server";

export default async function ProfilePage() {
  const user = await currentUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>Welcome {user.firstName}</h1>
      <p>Email: {user.emailAddresses[0].emailAddress}</p>
      <img src={user.imageUrl} alt="Avatar" />
    </div>
  );
}
```

### Get User ID (Server Component)
```typescript
import { auth } from "@clerk/nextjs/server";

export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Not authenticated</div>;
  }

  // Use userId for data fetching
  const userData = await fetchUserData(userId);

  return <div>{/* Render data */}</div>;
}
```

### Get Auth State (Client Component)
```typescript
"use client";

import { useAuth } from "@clerk/nextjs";

export function MyComponent() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <div>Please sign in</div>;
  }

  return <div>User ID: {userId}</div>;
}
```

### Get User Info (Client Component)
```typescript
"use client";

import { useUser } from "@clerk/nextjs";

export function UserProfile() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div>
      <h2>{user.firstName} {user.lastName}</h2>
      <p>{user.emailAddresses[0].emailAddress}</p>
      <img src={user.imageUrl} alt="Avatar" />
    </div>
  );
}
```

### Protected API Route
```typescript
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Your protected logic here
  const data = await fetchData(userId);

  return NextResponse.json(data);
}
```

### Protected API Route (with user data)
```typescript
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();

  // Use user.id, user.emailAddresses[0].emailAddress, etc.
  const result = await processData(user.id, body);

  return NextResponse.json(result);
}
```

## Advanced Patterns

### Client-Side Protected Route Wrapper
```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}

// Usage
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>
```

### Conditional Rendering Based on Auth
```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

export function Navigation() {
  const { isSignedIn } = useAuth();

  return (
    <nav>
      {isSignedIn ? (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <UserButton />
        </>
      ) : (
        <>
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign Up</Link>
        </>
      )}
    </nav>
  );
}
```

### Organization/Tenant Support
```typescript
"use client";

import { useOrganization } from "@clerk/nextjs";

export function TenantComponent() {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // Use organization.id as tenant_id
  const tenantId = organization?.id;

  return (
    <div>
      <h2>Organization: {organization?.name}</h2>
      <p>Tenant ID: {tenantId}</p>
    </div>
  );
}
```

### Custom Sign-In/Sign-Up Buttons
```typescript
"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function AuthButtons() {
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();

  return (
    <div>
      <button onClick={() => openSignIn()}>
        Sign In
      </button>
      <button onClick={() => openSignUp()}>
        Sign Up
      </button>
    </div>
  );
}
```

### Handle Sign Out
```typescript
"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <button
      onClick={() => signOut(() => router.push("/login"))}
    >
      Sign Out
    </button>
  );
}
```

## Clerk Component Customization

### Custom SignIn Appearance
```typescript
<SignIn
  appearance={{
    elements: {
      rootBox: "mx-auto",
      card: "bg-white shadow-2xl",
      headerTitle: "text-2xl font-bold",
      headerSubtitle: "text-gray-600",
      socialButtonsBlockButton: "border-2 hover:bg-gray-50",
      formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
      footerActionLink: "text-blue-600 hover:text-blue-700",
    },
    layout: {
      socialButtonsPlacement: "top",
      socialButtonsVariant: "blockButton",
    },
  }}
  routing="path"
  path="/login"
  signUpUrl="/signup"
/>
```

### Custom UserButton
```typescript
<UserButton
  appearance={{
    elements: {
      avatarBox: "w-10 h-10 border-2 border-white",
      userButtonPopoverCard: "shadow-xl rounded-lg",
      userButtonPopoverActionButton: "hover:bg-gray-100",
    },
  }}
  showName={true}
  afterSignOutUrl="/login"
  userProfileMode="modal"
  userProfileProps={{
    appearance: {
      elements: {
        card: "shadow-2xl",
      },
    },
  }}
/>
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Useful Commands

```bash
# Check Clerk configuration
pnpm check:clerk

# Run dev server
pnpm dev

# Build production
pnpm build

# Run E2E tests
pnpm test:e2e

# Run auth tests only
pnpm test:e2e tests/e2e/auth.spec.ts
```

## TypeScript Types

### User Type
```typescript
import type { User } from "@clerk/nextjs/server";

function processUser(user: User) {
  const userId = user.id;
  const email = user.emailAddresses[0].emailAddress;
  const firstName = user.firstName;
  const lastName = user.lastName;
  const imageUrl = user.imageUrl;
}
```

### Auth State Type
```typescript
import type { AuthObject } from "@clerk/nextjs/server";

function processAuth(auth: AuthObject) {
  const { userId, sessionId, orgId } = auth;
}
```

## Testing Snippets

### Playwright Test Setup
```typescript
import { test, expect } from '@playwright/test';

test('user can sign in', async ({ page }) => {
  await page.goto('/login');

  // Wait for Clerk component to load
  await expect(page.locator('[data-clerk-element]'))
    .toBeVisible({ timeout: 10000 });

  // Fill in credentials
  await page.fill('input[name="identifier"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');

  // Submit form
  await page.click('button[type="submit"]');

  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
});
```

## Debugging

### Enable Clerk Debug Mode
```typescript
// Add to app/layout.tsx
<ClerkProvider
  debug={process.env.NODE_ENV === 'development'}
>
  {children}
</ClerkProvider>
```

### Check Auth State in Console
```typescript
"use client";

import { useAuth } from "@clerk/nextjs";

export function DebugAuth() {
  const auth = useAuth();

  useEffect(() => {
    console.log('Auth State:', auth);
  }, [auth]);

  return null;
}
```

## Common Patterns Summary

| Pattern | Location | Type |
|---------|----------|------|
| Route Protection | middleware.ts | Edge |
| Get User ID | Server Component | Server |
| Get Full User | Server Component | Server |
| Auth State | Client Component | Client |
| User Info | Client Component | Client |
| Protected API | API Route | Server |
| User Button | Component | Client |
| Sign Out | Component | Client |

## Next Steps

1. Copy snippets as needed for your features
2. Refer to CLERK_SETUP.md for configuration
3. Check ARCHITECTURE.md for system design
4. Use VERIFICATION_CHECKLIST.md for testing
