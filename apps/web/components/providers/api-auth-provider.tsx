'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setAuthTokenGetter } from '@/lib/api/client';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Demo mode provider - no auth needed
function DemoApiAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setAuthTokenGetter(async () => null);
  }, []);

  return <>{children}</>;
}

// Clerk auth provider - sets up token getter for API calls
function ClerkApiAuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set the Clerk getToken function as the auth token getter
    setAuthTokenGetter(async () => {
      try {
        const token = await getToken();
        return token;
      } catch {
        return null;
      }
    });
  }, [getToken]);

  return <>{children}</>;
}

// Export the appropriate provider based on mode
export function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  if (isDemoMode) {
    return <DemoApiAuthProvider>{children}</DemoApiAuthProvider>;
  }
  return <ClerkApiAuthProvider>{children}</ClerkApiAuthProvider>;
}
