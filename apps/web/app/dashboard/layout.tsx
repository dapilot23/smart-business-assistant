"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiAuthProvider } from "@/components/providers/api-auth-provider";
import { Icon } from "../components/Icon";

const navItems = [
  { href: "/dashboard", label: "Today" },
  { href: "/dashboard/inbox", label: "Inbox" },
  { href: "/dashboard/money", label: "Money" },
  { href: "/dashboard/auto", label: "Autopilot" },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
        active
          ? "bg-primary/10 text-primary border-primary/30"
          : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary"
      }`}
    >
      {label}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ApiAuthProvider>
      <div className="min-h-screen w-full bg-background">
        <header className="sticky top-0 z-30 border-b border-border-subtle bg-background/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground">
                  <Icon name="sparkles" size={18} />
                </div>
                <div>
                  <div className="font-primary text-[16px] font-semibold text-foreground">
                    AI Employee OS
                  </div>
                  <div className="font-secondary text-[12px] text-muted-foreground">
                    Simple business operating system
                  </div>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border-subtle bg-card px-3 py-1 text-xs text-muted-foreground">
                  AI employee online
                </span>
                <button className="rounded-full border border-border-subtle bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary">
                  Autopilot: Draft + Ask
                </button>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={pathname === item.href}
                />
              ))}
            </nav>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Icon
                  name="sparkles"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Ask your AI employee to handle sales, support, or follow-ups…"
                  className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
                />
              </div>
              <button className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Run
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border-subtle bg-card px-3 py-1">"Follow up on late invoices"</span>
              <span className="rounded-full border border-border-subtle bg-card px-3 py-1">"Fill Tuesday schedule"</span>
              <span className="rounded-full border border-border-subtle bg-card px-3 py-1">"Send review requests"</span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </ApiAuthProvider>
  );
}
