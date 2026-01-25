'use client';

import { useEffect } from 'react';
import { setAuthTokenGetter } from '@/lib/api/client';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Demo mode provider - no auth needed
function DemoApiAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setAuthTokenGetter(async () => null);
  }, []);

  return <>{children}</>;
}

// Clerk auth provider - only used when not in demo mode
function ClerkApiAuthProvider({ children }: { children: React.ReactNode }) {
  // For now, just render children - the auth will be handled by Clerk context
  // In non-demo mode, the ClerkProvider in layout.tsx will handle auth
  return <>{children}</>;
}

// Export the appropriate provider based on mode
export function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  if (isDemoMode) {
    return <DemoApiAuthProvider>{children}</DemoApiAuthProvider>;
  }
  return <ClerkApiAuthProvider>{children}</ClerkApiAuthProvider>;
}
