# Clerk Authentication Setup

## Environment Variables

The following environment variables are required in `.env.local`:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Clerk URLs (already configured)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Getting Your Clerk Keys

1. Go to https://dashboard.clerk.com
2. Create a new application or select an existing one
3. Navigate to **API Keys** in the sidebar
4. Copy your **Publishable Key** and **Secret Key**
5. Update `.env.local` with the actual keys

## What's Configured

### 1. Middleware (`/middleware.ts`)
- Protects all routes except: `/`, `/login`, `/signup`, and API webhooks
- Redirects unauthenticated users to `/login`

### 2. Root Layout (`/app/layout.tsx`)
- Wraps entire app in `<ClerkProvider>`

### 3. Auth Pages
- `/app/(auth)/layout.tsx` - Centered card layout for auth pages
- `/app/(auth)/login/page.tsx` - Sign in with Clerk's `<SignIn />` component
- `/app/(auth)/signup/page.tsx` - Sign up with Clerk's `<SignUp />` component

### 4. Dashboard (`/app/(dashboard)/layout.tsx`)
- Protected by middleware
- Header includes `<UserButton />` component with user menu

### 5. User Button Component (`/components/user-button.tsx`)
- Displays user avatar
- Dropdown with account management and sign out
- Redirects to `/login` after sign out

## Testing the Setup

1. Update `.env.local` with real Clerk keys
2. Run `pnpm dev`
3. Navigate to `http://localhost:3000/dashboard`
4. You should be redirected to `/login`
5. Create an account or sign in
6. After authentication, you'll be redirected to `/dashboard`
7. Click the user avatar to see the user menu

## Route Protection

All routes under `/dashboard/*` are protected:
- Unauthenticated users are redirected to `/login`
- After sign in, users are redirected to `/dashboard`

Public routes:
- `/` - Landing page
- `/login` - Sign in page
- `/signup` - Sign up page
