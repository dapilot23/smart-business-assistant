'use client';

import Link from "next/link";
import { ApiAuthProvider } from "@/components/providers/api-auth-provider";
import { ChatButton } from "@/components/ai-copilot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ApiAuthProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <span className="font-bold">Smart Business Assistant</span>
              </Link>
            </div>

            <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-foreground/80"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/appointments"
                className="transition-colors hover:text-foreground/80"
              >
                Appointments
              </Link>
              <Link
                href="/dashboard/customers"
                className="transition-colors hover:text-foreground/80"
              >
                Customers
              </Link>
              <Link
                href="/dashboard/quotes"
                className="transition-colors hover:text-foreground/80"
              >
                Quotes
              </Link>
              <Link
                href="/dashboard/insights"
                className="transition-colors hover:text-foreground/80"
              >
                Insights
              </Link>
              <Link
                href="/dashboard/settings"
                className="transition-colors hover:text-foreground/80"
              >
                Settings
              </Link>
            </nav>

            <div className="flex items-center">
              <span className="text-sm text-muted-foreground">Demo Mode</span>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
        <ChatButton />
      </div>
    </ApiAuthProvider>
  );
}
