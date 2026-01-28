"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthLoading } from "./auth-loading";

/**
 * Client-side protected route wrapper
 * Provides an additional layer of protection beyond middleware
 *
 * Usage:
 * <ProtectedRoute>
 *   <YourComponent />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <AuthLoading />;
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}
