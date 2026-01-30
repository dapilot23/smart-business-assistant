"use client";

import { InterviewContainer } from "@/components/onboarding-interview";

export function OnboardingContent() {
  // Business name is optional - the interview will work without it
  // The API can fetch user info if needed
  return (
    <div className="h-screen bg-background">
      <InterviewContainer />
    </div>
  );
}
