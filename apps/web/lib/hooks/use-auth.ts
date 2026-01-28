'use client';

import { useAuth as useClerkAuth } from '@clerk/nextjs';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Demo user values
const DEMO_USER = {
  userId: 'demo-user-id',
  isLoaded: true,
  isSignedIn: true,
  sessionId: 'demo-session-id',
  orgId: 'demo-org-id',
  orgRole: 'admin' as const,
  orgSlug: 'demo-org',
};

/**
 * Wrapper around Clerk's useAuth that provides demo values when in demo mode.
 * This allows the app to work without Clerk in demo mode.
 */
export function useAuth() {
  // In demo mode, return demo values without calling Clerk hooks
  if (isDemoMode) {
    return {
      ...DEMO_USER,
      signOut: async () => {},
      getToken: async () => 'demo-token',
      has: () => true,
    };
  }

  // In non-demo mode, use real Clerk auth
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkAuth();
}
