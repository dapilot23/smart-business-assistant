"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export default function UnsubscribePage() {
  const params = useSearchParams();
  const tenantId = params.get("tenantId") || undefined;
  const tenantSlug = params.get("tenantSlug") || undefined;
  const email = params.get("email") || undefined;

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!email || (!tenantId && !tenantSlug)) {
      setStatus("error");
      setMessage("Missing unsubscribe information.");
      return;
    }

    const run = async () => {
      try {
        setStatus("loading");
        const response = await fetch(`${API_BASE}/public/communications/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            tenantSlug,
            email,
            channel: "EMAIL",
          }),
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        setStatus("success");
        setMessage("You have been unsubscribed from email updates.");
      } catch (error) {
        setStatus("error");
        setMessage("We could not process your request. Please try again later.");
      }
    };

    run();
  }, [email, tenantId, tenantSlug]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm text-center space-y-4">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Email Preferences
        </h1>
        {status === "loading" && (
          <p className="text-[var(--muted-foreground)]">
            Processing your request...
          </p>
        )}
        {status === "success" && (
          <p className="text-[var(--foreground)]">{message}</p>
        )}
        {status === "error" && (
          <p className="text-[var(--destructive)]">{message}</p>
        )}
      </div>
    </div>
  );
}
