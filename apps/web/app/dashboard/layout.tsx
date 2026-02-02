"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiAuthProvider } from "@/components/providers/api-auth-provider";
import { Icon } from "../components/Icon";
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
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
        active
          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_18px_rgba(110,231,183,0.18)]"
          : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-100"
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
      <div className="relative min-h-screen w-full bg-os-shell text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-40" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_65%)]" />

        <header className="relative z-20 pt-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 sm:px-6">
            <div className="flex flex-col gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-400/10 text-emerald-200">
                  <Icon name="sparkles" size={18} />
                </div>
                <div>
                  <div className="font-display text-[16px] font-semibold text-slate-100">
                    Business OS
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Agentic workflow layer
                  </div>
                </div>
              </Link>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 sm:justify-center">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">
                  AI online
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Focused ops mode
                </span>
                <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 sm:inline-flex">
                  24/7 agent coverage
                </span>
              </div>

              <button className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_18px_rgba(110,231,183,0.35)]">
                Autopilot: {modeLabel}
              </button>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={pathname === item.href}
                />
              ))}
            </nav>

          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          {children}
        </main>
      </div>
    </ApiAuthProvider>
  );
}
