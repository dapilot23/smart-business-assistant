"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../components/Icon";
import { ApiAuthProvider } from "@/components/providers/api-auth-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" as const },
  { href: "/dashboard/appointments", label: "Appointments", icon: "calendar" as const },
  { href: "/dashboard/jobs", label: "Jobs", icon: "briefcase" as const },
  { href: "/dashboard/availability", label: "Availability", icon: "calendar-days" as const },
  { href: "/dashboard/customers", label: "Customers", icon: "users" as const },
  { href: "/dashboard/team", label: "Team", icon: "users" as const },
  { href: "/dashboard/quotes", label: "Quotes", icon: "quote" as const },
  { href: "/dashboard/sms", label: "SMS", icon: "message-square" as const },
  { href: "/dashboard/voice", label: "Voice AI", icon: "phone-call" as const },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" as const },
];

function DemoUserSection() {
  return (
    <div className="flex items-center gap-3 p-4 border-t border-[var(--border)]">
      <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
        <Icon name="user-circle" size={20} className="text-[var(--primary-foreground)]" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-secondary text-[14px] font-medium text-[var(--foreground)] truncate">
          Demo User
        </span>
        <span className="font-secondary text-[12px] text-[var(--muted-foreground)] truncate">
          Elite Plumbing
        </span>
      </div>
    </div>
  );
}

function Sidebar({
  pathname,
  onNavClick
}: {
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center h-16 lg:h-20 px-4 lg:px-6 border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavClick}>
          <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
            <Icon name="layout-dashboard" size={18} className="text-[var(--primary-foreground)]" />
          </div>
          <span className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
            SBA
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 lg:p-4 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center gap-3 h-11 lg:h-10 px-4 rounded-full transition-colors ${
                isActive
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon name={item.icon} size={18} />
              <span className="font-secondary text-[14px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <DemoUserSection />
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <ApiAuthProvider>
      <div className="flex h-full w-full">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 border-b border-[var(--border)] bg-[var(--background)]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <Icon name="layout-dashboard" size={18} className="text-[var(--primary-foreground)]" />
            </div>
            <span className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
              SBA
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[var(--secondary)] transition-colors"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            <Icon name={sidebarOpen ? "x" : "menu"} size={24} className="text-[var(--foreground)]" />
          </button>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-[var(--background)] border-r border-[var(--border)] transform transition-transform duration-300 ease-in-out flex flex-col ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar pathname={pathname} onNavClick={() => setSidebarOpen(false)} />
        </aside>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-[var(--border)] bg-[var(--background)]">
          <Sidebar pathname={pathname} />
        </aside>

        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden pt-14 lg:pt-0">
          {children}
        </div>
      </div>
    </ApiAuthProvider>
  );
}
