"use client";

import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";

// Get current greeting based on time
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Get formatted date
function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Welcome");
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
    setFormattedDate(getFormattedDate());
  }, []);

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center justify-between h-20 px-8 border-b border-[var(--border)]">
        {/* Left - Greeting */}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-primary text-[20px] font-semibold text-[var(--foreground)]">
            {greeting}
          </h1>
          <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
            {formattedDate}
          </p>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <button className="flex items-center gap-2.5 h-10 px-4 w-[280px] bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--secondary)] transition-colors">
            <Icon name="search" size={18} className="text-[var(--muted-foreground)]" />
            <span className="font-secondary text-[14px] text-[var(--muted-foreground)]">
              Search anything...
            </span>
          </button>

          {/* Notification */}
          <button className="flex items-center justify-center w-10 h-10 bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--secondary)] transition-colors">
            <Icon name="bell" size={20} className="text-[var(--foreground)]" />
          </button>

          {/* New Appointment Button */}
          <button className="flex items-center gap-1.5 h-10 px-4 bg-[var(--primary)] rounded-full hover:opacity-90 transition-opacity">
            <Icon name="plus" size={20} className="text-[var(--primary-foreground)]" />
            <span className="font-primary text-[14px] font-medium text-[var(--primary-foreground)]">
              New Appointment
            </span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex flex-col flex-1 gap-6 p-8 overflow-auto">
        {/* Metrics Row */}
        <div className="flex gap-5 w-full">
          <MetricCard title="Total Appointments" value="127" change="+12.5%" />
          <MetricCard title="Pending Quotes" value="23" change="+5.2%" />
          <MetricCard title="Revenue" value="$48,250" change="+17.1%" />
          <MetricCard title="Messages" value="892" change="+8.4%" />
        </div>

        {/* Main Columns */}
        <div className="flex gap-6 flex-1">
          {/* Left Column */}
          <div className="flex flex-col flex-1 gap-6">
            <RecentActivity />
          </div>

          {/* Right Column */}
          <div className="flex flex-col w-[400px] gap-6">
            <QuickActions />
            <ScheduleCard />
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ title, value, change }: { title: string; value: string; change: string }) {
  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] border border-[var(--border)] shadow-sm">
      <div className="p-6 border-b border-[var(--border)]">
        <p className="font-primary text-[16px] text-[var(--muted-foreground)]">{title}</p>
      </div>
      <div className="p-6 flex flex-col gap-2">
        <p className="font-primary text-[32px] text-[var(--foreground)]">{value}</p>
        <div className="inline-flex items-center gap-1 px-2 py-2 bg-[var(--color-success)] rounded-full w-fit">
          <Icon name="trending-up" size={16} className="text-[var(--color-success-foreground)]" />
          <span className="font-primary text-[14px] text-[var(--color-success-foreground)]">
            {change}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { icon: "phone" as const, label: "New Call" },
    { icon: "mail" as const, label: "Send Email" },
    { icon: "file-text" as const, label: "New Quote" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
        Quick Actions
      </h3>
      <div className="flex gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            className="flex-1 flex flex-col items-center justify-center gap-2 h-[100px] p-4 bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-m)] hover:bg-[var(--secondary)] transition-colors"
          >
            <Icon name={action.icon} size={28} className="text-[var(--primary)]" />
            <span className="font-secondary text-[13px] font-medium text-[var(--foreground)] text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScheduleCard() {
  const scheduleItems = [
    { title: "Client Meeting - ABC Corp", time: "Tomorrow, 9:00 AM", color: "bg-[var(--primary)]" },
    { title: "Service Call - Home Repair", time: "Tomorrow, 2:00 PM", color: "bg-[var(--color-info-foreground)]" },
    { title: "Quote Follow-up", time: "Friday, 11:00 AM", color: "bg-[var(--color-warning-foreground)]" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
        Upcoming Schedule
      </h3>
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm overflow-hidden">
        {scheduleItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-4 ${
              index < scheduleItems.length - 1 ? "border-b border-[var(--border)]" : ""
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            <div className="flex flex-col gap-0.5 flex-1">
              <span className="font-secondary text-[14px] font-medium text-[var(--foreground)]">
                {item.title}
              </span>
              <span className="font-secondary text-[12px] text-[var(--muted-foreground)]">
                {item.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <h3 className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
        Recent Activity
      </h3>
      <div className="flex-1 bg-[var(--card)] border border-[var(--border)] shadow-sm p-6">
        <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
          No recent activity to display. Your activity will appear here.
        </p>
      </div>
    </div>
  );
}
