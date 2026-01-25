"use client";

import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { AppointmentsChart } from "@/components/dashboard/appointments-chart";
import { TopServicesChart } from "@/components/dashboard/top-services-chart";
import {
  getDashboardStats,
  getRevenueChart,
  getAppointmentStats,
  getTopServices,
  type DashboardStats,
  type RevenueDataPoint,
  type AppointmentStats as AppointmentStatsType,
  type TopService,
} from "@/lib/api/reports";

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [appointmentStats, setAppointmentStats] = useState<AppointmentStatsType[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setGreeting(getGreeting());
    setFormattedDate(getFormattedDate());
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [statsData, revenueChartData, appointmentStatsData, topServicesData] = await Promise.all([
        getDashboardStats(),
        getRevenueChart('30d'),
        getAppointmentStats('30d'),
        getTopServices(),
      ]);
      setStats(statsData);
      setRevenueData(revenueChartData);
      setAppointmentStats(appointmentStatsData);
      setTopServices(topServicesData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

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
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Icon name="loader-2" size={32} className="text-[var(--primary)] animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatsCard
                icon="dollar-sign"
                label="Revenue This Month"
                value={stats?.revenue?.current?.toLocaleString() ?? 0}
                change={stats?.revenue?.change}
                prefix="$"
              />
              <StatsCard
                icon="calendar"
                label="Appointments"
                value={stats?.appointments?.current ?? 0}
                change={stats?.appointments?.change}
              />
              <StatsCard
                icon="users"
                label="Active Customers"
                value={stats?.customers?.active ?? 0}
              />
              <StatsCard
                icon="phone"
                label="Calls Handled"
                value={stats?.calls?.handled ?? 0}
              />
              <StatsCard
                icon="file-text"
                label="Pending Quotes"
                value={stats?.quotes?.pending ?? 0}
              />
              <StatsCard
                icon="briefcase"
                label="Jobs in Progress"
                value={stats?.jobs?.inProgress ?? 0}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {revenueData.length > 0 && <RevenueChart data={revenueData} />}
              {appointmentStats.length > 0 && <AppointmentsChart data={appointmentStats} />}
            </div>

            {/* Top Services */}
            <div className="grid grid-cols-1 gap-6">
              {topServices.length > 0 && <TopServicesChart data={topServices} />}
            </div>

            {/* Recent Activity Section */}
            <div className="flex gap-6">
              <div className="flex-1">
                <RecentActivity />
              </div>
              <div className="w-[400px]">
                <ScheduleCard />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ScheduleCard() {
  const scheduleItems = [
    { title: "Client Meeting - ABC Corp", time: "Tomorrow, 9:00 AM", color: "bg-[var(--primary)]" },
    { title: "Service Call - Home Repair", time: "Tomorrow, 2:00 PM", color: "bg-blue-500" },
    { title: "Quote Follow-up", time: "Friday, 11:00 AM", color: "bg-amber-500" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
        Upcoming Schedule
      </h3>
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm overflow-hidden rounded-lg">
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
    <div className="flex flex-col gap-4 w-full">
      <h3 className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
        Recent Activity
      </h3>
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-lg p-6">
        <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
          No recent activity to display. Your activity will appear here.
        </p>
      </div>
    </div>
  );
}
