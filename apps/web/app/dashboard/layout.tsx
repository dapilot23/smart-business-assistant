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
    <div className="flex items-center gap-3 p-4 mx-3 mb-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-glow">
        <Icon name="user-circle" size={20} className="text-primary-foreground" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-secondary text-[14px] font-medium text-foreground truncate">
          Demo User
        </span>
        <span className="font-secondary text-[12px] text-muted-foreground truncate">
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
      <div className="flex items-center h-16 lg:h-20 px-4 lg:px-6 border-b border-border-subtle">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavClick}>
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center shadow-glow">
            <Icon name="layout-dashboard" size={18} className="text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-primary text-[15px] font-bold text-foreground">
              SBA
            </span>
            <span className="font-secondary text-[10px] text-muted-foreground -mt-0.5">
              Business Assistant
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 lg:p-4 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard';
          const active = isActive || isExactDashboard;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`relative flex items-center gap-3 h-11 lg:h-10 px-4 rounded-lg transition-all duration-200 ${
                active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <Icon name={item.icon} size={18} className={active ? "text-primary" : ""} />
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
      <div className="flex h-full w-full bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border-subtle bg-card/95 backdrop-blur-md">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center">
              <Icon name="layout-dashboard" size={18} className="text-primary-foreground" />
            </div>
            <span className="font-primary text-[16px] font-semibold text-foreground">
              SBA
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            <Icon name={sidebarOpen ? "x" : "menu"} size={24} className="text-foreground" />
          </button>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border-subtle transform transition-transform duration-300 ease-in-out flex flex-col ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar pathname={pathname} onNavClick={() => setSidebarOpen(false)} />
        </aside>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-border-subtle bg-card">
          <Sidebar pathname={pathname} />
        </aside>

        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden pt-14 lg:pt-0 bg-background-subtle">
          {children}
        </div>
      </div>
    </ApiAuthProvider>
  );
}
