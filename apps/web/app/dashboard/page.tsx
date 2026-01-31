"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { getAgentTasks } from "@/lib/api/agent-tasks";
import { getDashboardStats, type DashboardStats } from "@/lib/api/reports";
import type { AgentTask } from "@/lib/types/agent-task";

type ActionItem = {
  id?: string;
  title: string;
  description?: string;
  priority?: string;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const fallbackTasks: ActionItem[] = [
  {
    title: "Confirm 3 appointments",
    description: "Auto-send confirmations for tomorrow's schedule.",
    priority: "HIGH",
  },
  {
    title: "Follow up on 6 warm leads",
    description: "AI drafted replies ready to approve.",
    priority: "MEDIUM",
  },
  {
    title: "Send 4 late payment reminders",
    description: "Projected $1.8k collection if sent today.",
    priority: "HIGH",
  },
];

export default function TodayPage() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [taskData, statsData] = await Promise.all([
          getAgentTasks({ status: "PENDING", limit: 6 }),
          getDashboardStats(),
        ]);
        setTasks(taskData ?? []);
        setStats(statsData ?? null);
      } catch (error) {
        console.error("Failed to load today data", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const displayTasks = useMemo<ActionItem[]>(() => {
    if (tasks.length === 0) return fallbackTasks;
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
    }));
  }, [tasks]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border-subtle bg-card p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {getGreeting()}, here's what matters today.
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate()}</p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              ${stats?.revenue?.current?.toLocaleString() ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Appointments</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {stats?.appointments?.current ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Open tasks</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {displayTasks.length}
            </p>
            <p className="text-xs text-muted-foreground">AI queued actions</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-border-subtle bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Top actions</h2>
              <p className="text-sm text-muted-foreground">Ranked by impact.</p>
            </div>
            <button className="rounded-full border border-border-subtle bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              Approve all
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon name="loader-2" size={16} className="animate-spin" />
                Loading actions…
              </div>
            ) : (
              displayTasks.map((task, index) => (
                <div
                  key={task.id ?? `${task.title}-${index}`}
                  className="rounded-2xl border border-border-subtle bg-background px-4 py-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                      <span className="rounded-full border border-border-subtle bg-card px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {task.priority ?? "HIGH"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                        Approve
                      </button>
                      <button className="rounded-full border border-border-subtle bg-card px-4 py-1.5 text-xs font-semibold text-foreground">
                        Edit
                      </button>
                      <button className="rounded-full border border-border-subtle bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">AI employee is doing</h2>
          <p className="text-sm text-muted-foreground">
            Running behind-the-scenes tasks so you don't have to.
          </p>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              Monitoring inbound leads and drafting replies.
            </div>
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              Watching schedule conflicts and proposing fixes.
            </div>
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              Tracking payments and preparing reminders.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
