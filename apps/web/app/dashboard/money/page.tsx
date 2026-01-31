"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import { getDashboardStats, type DashboardStats } from "@/lib/api/reports";
import { getAgentTasks } from "@/lib/api/agent-tasks";
import type { AgentTask } from "@/lib/types/agent-task";

type ActionItem = {
  id?: string;
  title: string;
  description?: string;
  priority?: string;
};

const fallbackCollections: ActionItem[] = [
  {
    title: "Send 4 payment reminders",
    description: "Projected $1.8k collection if sent today.",
    priority: "HIGH",
  },
  {
    title: "Offer payment plan to Patel",
    description: "Invoice is 12 days overdue.",
    priority: "MEDIUM",
  },
];

export default function MoneyPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [statsData, taskData] = await Promise.all([
          getDashboardStats(),
          getAgentTasks({ status: "PENDING", ownerAgentType: "REVENUE_SALES", limit: 4 }),
        ]);
        setStats(statsData ?? null);
        setTasks(taskData ?? []);
      } catch (error) {
        console.error("Failed to load money data", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const collections = useMemo<ActionItem[]>(() => {
    if (tasks.length === 0) return fallbackCollections;
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
          <h1 className="text-lg font-semibold text-foreground">Money</h1>
          <p className="text-sm text-muted-foreground">Cash flow and collections, simplified.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              ${stats?.revenue?.current?.toLocaleString() ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending quotes</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {stats?.quotes?.pending ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Jobs in progress</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {stats?.jobs?.inProgress ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">Active today</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border-subtle bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Collections queue</h2>
              <p className="text-sm text-muted-foreground">Approve, edit, or let AI run.</p>
            </div>
            <button className="rounded-full border border-border-subtle bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              Run all
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon name="loader-2" size={16} className="animate-spin" />
                Loading collections…
              </div>
            ) : (
              collections.map((task, index) => (
                <div
                  key={task.id ?? `${task.title}-${index}`}
                  className="rounded-2xl border border-border-subtle bg-background px-4 py-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                    <span className="rounded-full border border-border-subtle bg-card px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {task.priority ?? "MEDIUM"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                      Approve
                    </button>
                    <button className="rounded-full border border-border-subtle bg-card px-4 py-1.5 text-xs font-semibold text-foreground">
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">AI cash guardrails</h2>
          <p className="text-sm text-muted-foreground">Controls for hands-off collections.</p>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              Max discount: 10%
            </div>
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              Refund limit: $100 without approval
            </div>
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              Friendly reminders: 9am-6pm
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
