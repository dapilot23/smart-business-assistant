"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import { getAgentSettings, type AgentSettings } from "@/lib/api/agents";
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
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [statsData, taskData, settingsData] = await Promise.all([
          getDashboardStats(),
          getAgentTasks({ status: "PENDING", ownerAgentType: "REVENUE_SALES", limit: 4 }),
          getAgentSettings(),
        ]);
        setStats(statsData ?? null);
        setTasks(taskData ?? []);
        setSettings(settingsData ?? null);
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
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">
            Cashflow mode
          </span>
          <span className="font-primary text-emerald-200/80">&gt; ./business-os --money</span>
        </div>
        <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Money control</h1>
        <p className="text-sm text-slate-400">
          Watch collections, forecast revenue, and keep invoices moving with AI assistance.
        </p>
      </section>

      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Business pulse</p>
          <h2 className="font-display text-lg text-slate-100">Revenue signals</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Revenue</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">
              ${stats?.revenue?.current?.toLocaleString() ?? "--"}
            </p>
            <p className="text-xs text-slate-400">This month</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending quotes</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">
              {stats?.quotes?.pending ?? "--"}
            </p>
            <p className="text-xs text-slate-400">Awaiting approval</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Jobs in progress</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">
              {stats?.jobs?.inProgress ?? "--"}
            </p>
            <p className="text-xs text-slate-400">Active today</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Collections queue</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">Follow-up actions</h2>
            </div>
            <button className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300">
              Run all
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon name="loader-2" size={16} className="animate-spin" />
                Loading collections...
              </div>
            ) : (
              collections.map((task, index) => (
                <div
                  key={task.id ?? `${task.title}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-100">{task.title}</h3>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      {task.priority ?? "MEDIUM"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{task.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950">
                      Approve
                    </button>
                    <button className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-200">
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Guardrails</p>
            <h2 className="mt-2 font-display text-lg text-slate-100">Cash controls</h2>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              Max discount: {settings?.maxDiscountPercent ?? 10}%
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              Refund guardrails: coming soon
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              Messaging windows: coming soon
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
