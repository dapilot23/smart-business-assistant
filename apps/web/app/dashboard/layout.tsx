"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiAuthProvider } from "@/components/providers/api-auth-provider";
import { Icon } from "../components/Icon";
import { AskBar } from "./_components/ask-bar";
import { getAgentSettings, type AutopilotMode } from "@/lib/api/agents";

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
  const [autopilotMode, setAutopilotMode] = useState<AutopilotMode>("DRAFT");

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getAgentSettings();
        setAutopilotMode(settings.autopilotMode ?? "DRAFT");
      } catch (error) {
        console.error("Failed to load autopilot mode", error);
      }
    }

    loadSettings();
  }, []);

  const modeLabel =
    autopilotMode === "AUTO"
      ? "Auto-execute"
      : autopilotMode === "SUGGEST"
        ? "Suggest only"
        : "Draft + Ask";

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
                  Autopilot: {modeLabel}
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

            <AskBar />

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border-subtle bg-card px-3 py-1">
                Follow up on late invoices
              </span>
              <span className="rounded-full border border-border-subtle bg-card px-3 py-1">
                Fill Tuesday schedule
              </span>
              <span className="rounded-full border border-border-subtle bg-card px-3 py-1">
                Send review requests
              </span>
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
