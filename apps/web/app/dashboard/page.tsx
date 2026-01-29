"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Icon } from "../components/Icon";
import { StatsCard } from "@/components/dashboard/stats-card";
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

// Lazy load chart components - reduces initial bundle by ~89KB (Recharts library)
const RevenueChart = dynamic(
  () => import("@/components/dashboard/revenue-chart").then((mod) => mod.RevenueChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const AppointmentsChart = dynamic(
  () => import("@/components/dashboard/appointments-chart").then((mod) => mod.AppointmentsChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const TopServicesChart = dynamic(
  () => import("@/components/dashboard/top-services-chart").then((mod) => mod.TopServicesChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 h-[300px] animate-pulse">
      <div className="h-4 w-32 bg-muted rounded mb-4" />
      <div className="h-full w-full bg-muted/50 rounded" />
    </div>
  );
}

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
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:h-20 border-b border-[var(--border)]">
        {/* Left - Greeting */}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-primary text-lg sm:text-[20px] font-semibold text-[var(--foreground)]">
            {greeting}
          </h1>
          <p className="font-secondary text-[13px] sm:text-[14px] text-[var(--muted-foreground)]">
            {formattedDate}
          </p>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search - hidden on mobile, icon only on tablet */}
          <button className="hidden md:flex items-center gap-2.5 h-10 px-4 w-full md:w-[200px] lg:w-[280px] bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--secondary)] transition-colors">
            <Icon name="search" size={18} className="text-[var(--muted-foreground)]" />
            <span className="font-secondary text-[14px] text-[var(--muted-foreground)] truncate">
              Search anything...
            </span>
          </button>

          {/* Search icon for mobile */}
          <button className="md:hidden flex items-center justify-center w-10 h-10 bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--secondary)] transition-colors">
            <Icon name="search" size={20} className="text-[var(--foreground)]" />
          </button>

          {/* Notification */}
          <button className="flex items-center justify-center w-10 h-10 bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--secondary)] transition-colors">
            <Icon name="bell" size={20} className="text-[var(--foreground)]" />
          </button>

          {/* New Appointment Button */}
          <button className="flex items-center gap-1.5 h-10 px-3 sm:px-4 bg-[var(--primary)] rounded-full hover:opacity-90 transition-opacity">
            <Icon name="plus" size={20} className="text-[var(--primary-foreground)]" />
            <span className="hidden sm:inline font-primary text-[14px] font-medium text-[var(--primary-foreground)]">
              New Appointment
            </span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex flex-col flex-1 gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 overflow-auto">
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
                color="success"
              />
              <StatsCard
                icon="calendar"
                label="Appointments"
                value={stats?.appointments?.current ?? 0}
                change={stats?.appointments?.change}
                color="info"
              />
              <StatsCard
                icon="users"
                label="Active Customers"
                value={stats?.customers?.active ?? 0}
                color="purple"
              />
              <StatsCard
                icon="phone"
                label="Calls Handled"
                value={stats?.calls?.handled ?? 0}
                color="cyan"
              />
              <StatsCard
                icon="file-text"
                label="Pending Quotes"
                value={stats?.quotes?.pending ?? 0}
                color="warning"
              />
              <StatsCard
                icon="briefcase"
                label="Jobs in Progress"
                value={stats?.jobs?.inProgress ?? 0}
                color="primary"
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
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] xl:grid-cols-[1fr_400px] gap-4 sm:gap-6">
              <RecentActivity />
              <ScheduleCard />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ScheduleCard() {
  const scheduleItems = [
    { title: "Client Meeting - ABC Corp", time: "Tomorrow, 9:00 AM", color: "bg-primary", borderColor: "border-primary/30" },
    { title: "Service Call - Home Repair", time: "Tomorrow, 2:00 PM", color: "bg-info", borderColor: "border-info/30" },
    { title: "Quote Follow-up", time: "Friday, 11:00 AM", color: "bg-warning", borderColor: "border-warning/30" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="font-primary text-[16px] font-semibold text-foreground">
        Upcoming Schedule
      </h3>
      <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
        {scheduleItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors cursor-pointer ${
              index < scheduleItems.length - 1 ? "border-b border-border-subtle" : ""
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${item.color} ring-4 ring-opacity-20 ${item.borderColor}`} />
            <div className="flex flex-col gap-0.5 flex-1">
              <span className="font-secondary text-[14px] font-medium text-foreground">
                {item.title}
              </span>
              <span className="font-secondary text-[12px] text-muted-foreground">
                {item.time}
              </span>
            </div>
            <Icon name="chevron-right" size={16} className="text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  const activities = [
    { icon: "calendar" as const, text: "Appointment scheduled with John Smith", time: "2 hours ago", color: "text-info" },
    { icon: "file-text" as const, text: "Quote #1234 sent to ABC Corp", time: "4 hours ago", color: "text-warning" },
    { icon: "check" as const, text: "Job #567 completed successfully", time: "Yesterday", color: "text-success" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="font-primary text-[16px] font-semibold text-foreground">
        Recent Activity
      </h3>
      <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
        {activities.length === 0 ? (
          <div className="p-6">
            <p className="font-secondary text-[14px] text-muted-foreground">
              No recent activity to display. Your activity will appear here.
            </p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 hover:bg-secondary/50 transition-colors ${
                index < activities.length - 1 ? "border-b border-border-subtle" : ""
              }`}
            >
              <div className={`mt-0.5 ${activity.color}`}>
                <Icon name={activity.icon} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-secondary text-[14px] text-foreground">{activity.text}</p>
                <p className="font-secondary text-[12px] text-muted-foreground mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
