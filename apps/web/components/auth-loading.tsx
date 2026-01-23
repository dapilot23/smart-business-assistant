"use client";

/**
 * Loading state for authentication pages
 * Displays a centered spinner while Clerk components load
 *
 * Usage:
 * <AuthLoading />
 */
export function AuthLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
