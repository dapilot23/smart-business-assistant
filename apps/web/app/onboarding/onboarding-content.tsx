"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { InterviewContainer } from "@/components/onboarding-interview";

export function OnboardingContent() {
  const { user, isLoaded } = useUser();
  const [businessName, setBusinessName] = useState<string | undefined>();

  useEffect(() => {
    if (isLoaded && user) {
      // Try to get business name from organization or user metadata
      const orgName = user.organizationMemberships?.[0]?.organization?.name;
      const userName = user.firstName ? `${user.firstName}'s Business` : undefined;
      setBusinessName(orgName || userName);
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <InterviewContainer businessName={businessName} />
    </div>
  );
}
