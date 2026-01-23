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
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-[var(--background)] to-[var(--secondary)] py-20 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              AI-Powered Business Assistant
              <br />
              <span className="text-[var(--primary)]">for Service Businesses</span>
            </h1>

            <p className="max-w-3xl mx-auto text-xl text-[var(--muted-foreground)] mb-10">
              Automate calls, scheduling, quotes, and invoicing. Focus on growing your business while AI handles the rest.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-8 py-4 text-base font-semibold text-[var(--primary-foreground)] shadow-lg hover:bg-[var(--primary)]/90 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-8 py-4 text-base font-semibold shadow hover:bg-[var(--accent)] transition-colors"
              >
                Log In
              </Link>
            </div>

            {/* Hero Image Placeholder */}
            <div className="max-w-5xl mx-auto">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 border border-[var(--border)] shadow-2xl flex items-center justify-center">
                <p className="text-[var(--muted-foreground)] text-lg">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-8 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to run your business</h2>
            <p className="text-xl text-[var(--muted-foreground)]">
              Powerful features designed specifically for service businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon="🤖"
              title="AI Phone Agent"
              description="24/7 call handling with natural voice conversations. Never miss a customer call again."
            />
            <FeatureCard
              icon="📅"
              title="Smart Scheduling"
              description="Online booking with real-time availability. Automatic reminders and confirmations."
            />
            <FeatureCard
              icon="💼"
              title="Quote Builder"
              description="Create professional quotes in minutes. Track status and convert to jobs instantly."
            />
            <FeatureCard
              icon="💳"
              title="Invoicing"
              description="Get paid faster with Stripe integration. Automatic payment reminders and receipts."
            />
            <FeatureCard
              icon="👥"
              title="Team Management"
              description="Assign jobs to technicians. Track time and manage schedules efficiently."
            />
            <FeatureCard
              icon="📊"
              title="Job Tracking"
              description="Photos and notes from the field. Real-time job status updates for customers."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-8 bg-[var(--secondary)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-[var(--muted-foreground)]">
              Choose the plan that fits your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard
              name="Starter"
              price="$99"
              period="/month"
              features={[
                "Up to 500 calls/month",
                "2 team members",
                "Online booking",
                "Quotes & invoicing",
                "SMS notifications",
                "Basic analytics",
              ]}
            />
            <PricingCard
              name="Professional"
              price="$199"
              period="/month"
              featured
              features={[
                "Up to 2,000 calls/month",
                "5 team members",
                "Everything in Starter",
                "Advanced analytics",
                "Priority support",
                "Custom branding",
              ]}
            />
            <PricingCard
              name="Business"
              price="$399"
              period="/month"
              features={[
                "Unlimited calls",
                "Unlimited team members",
                "Everything in Professional",
                "API access",
                "Dedicated support",
                "Custom integrations",
              ]}
            />
          </div>

          <p className="text-center text-[var(--muted-foreground)] mt-12">
            All plans include: Smart Scheduling, Quotes, Invoicing, and SMS
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-8 bg-[var(--primary)] text-[var(--primary-foreground)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to streamline your business?
          </h2>
          <p className="text-xl mb-10 opacity-90">
            Join hundreds of service businesses already using Smart Business Assistant
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--background)] px-8 py-4 text-base font-semibold text-[var(--foreground)] shadow-lg hover:bg-[var(--background)]/90 transition-colors"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 bg-[var(--background)] border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">Smart Business Assistant</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                AI-powered automation for service businesses
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li>
                  <Link href="#features" className="hover:text-[var(--foreground)]">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-[var(--foreground)]">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li>
                  <Link href="#" className="hover:text-[var(--foreground)]">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-[var(--foreground)]">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Account</h4>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li>
                  <Link href="/login" className="hover:text-[var(--foreground)]">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-[var(--foreground)]">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--border)] text-center text-sm text-[var(--muted-foreground)]">
            <p>&copy; 2026 Smart Business Assistant. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col p-6 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  features,
  featured = false,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`flex flex-col p-8 rounded-xl border-2 ${
        featured
          ? 'border-[var(--primary)] bg-[var(--card)] shadow-xl scale-105'
          : 'border-[var(--border)] bg-[var(--card)]'
      }`}
    >
      {featured && (
        <div className="inline-block self-start px-3 py-1 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold mb-4">
          Most Popular
        </div>
      )}
      <h3 className="text-2xl font-bold mb-2">{name}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-[var(--muted-foreground)]">{period}</span>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-[var(--primary)] mt-1">✓</span>
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
          featured
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90'
            : 'border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--accent)]'
        }`}
      >
        Get Started
      </Link>
    </div>
  );
}
