import { Suspense } from "react";
import UnsubscribeClient from "./unsubscribe-client";

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6 py-16">
          <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm text-center">
            <p className="text-[var(--muted-foreground)]">Loading preferences...</p>
          </div>
        </div>
      }
    >
      <UnsubscribeClient />
    </Suspense>
  );
}
