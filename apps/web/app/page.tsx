import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { userId } = await auth();

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Smart Business Assistant
        </h1>

        <p className="max-w-2xl text-lg text-muted-foreground">
          AI-powered business assistant with voice, SMS, and intelligent
          automation to help you manage your business effortlessly.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-border bg-background px-8 py-3 text-sm font-semibold shadow-sm hover:bg-accent"
          >
            Sign Up
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-8">
          <FeatureCard
            title="Voice AI"
            description="Handle calls with intelligent voice assistant"
          />
          <FeatureCard
            title="SMS Integration"
            description="Automated text message responses"
          />
          <FeatureCard
            title="Business Intelligence"
            description="AI-powered insights and analytics"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-6 text-card-foreground">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
