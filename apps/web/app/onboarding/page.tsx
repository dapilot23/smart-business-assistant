import { OnboardingContent } from "./onboarding-content";

// Prevent static generation since this page uses Clerk hooks
export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return <OnboardingContent />;
}
