"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Icon } from "../components/Icon";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" as const },
  { href: "/dashboard/appointments", label: "Appointments", icon: "calendar" as const },
  { href: "/dashboard/availability", label: "Availability", icon: "calendar-days" as const },
  { href: "/dashboard/customers", label: "Customers", icon: "users" as const },
  { href: "/dashboard/quotes", label: "Quotes", icon: "quote" as const },
  { href: "/dashboard/voice", label: "Voice AI", icon: "phone-call" as const },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" as const },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar */}
      <aside className="flex flex-col w-64 border-r border-[var(--border)] bg-[var(--background)]">
        {/* Logo */}
        <div className="flex items-center h-20 px-6 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <Icon name="layout-dashboard" size={18} className="text-[var(--primary-foreground)]" />
            </div>
            <span className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
              SBA
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 p-4 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 h-10 px-4 rounded-full transition-colors ${
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
        <div className="flex items-center gap-3 p-4 border-t border-[var(--border)]">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-10 h-10"
              }
            }}
          />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-secondary text-[14px] font-medium text-[var(--foreground)] truncate">
              User
            </span>
            <span className="font-secondary text-[12px] text-[var(--muted-foreground)] truncate">
              Account
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
