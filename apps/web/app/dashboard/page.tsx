"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { getAgentTasks, updateAgentTask } from "@/lib/api/agent-tasks";
import { approveAction, cancelAction, getActions, type AIAction } from "@/lib/api/ai-actions";
import { triggerAllAgents } from "@/lib/api/insights";
import { getDashboardStats, type DashboardStats } from "@/lib/api/reports";
import type { AgentTask } from "@/lib/types/agent-task";

type ActionItem = {
  id?: string;
  source?: "action" | "task" | "fallback";
  title: string;
  description?: string;
  priority?: string;
};

const systemModules = [
  { label: "Sales Pipeline", icon: "trending-up", tone: "text-emerald-200" },
  { label: "Lead Capture", icon: "target", tone: "text-lime-200" },
  { label: "Bookings", icon: "calendar", tone: "text-sky-200" },
  { label: "Dispatch", icon: "briefcase", tone: "text-indigo-200" },
  { label: "Quotes", icon: "quote", tone: "text-amber-200" },
  { label: "Invoices", icon: "file-text", tone: "text-orange-200" },
  { label: "Payments", icon: "credit-card", tone: "text-emerald-300" },
  { label: "Support", icon: "inbox", tone: "text-cyan-200" },
  { label: "Messaging", icon: "message-square", tone: "text-sky-300" },
  { label: "Calls", icon: "phone", tone: "text-rose-200" },
  { label: "Email", icon: "mail", tone: "text-blue-200" },
  { label: "Customers", icon: "users", tone: "text-teal-200" },
  { label: "Reporting", icon: "bar-chart-3", tone: "text-emerald-200" },
  { label: "Campaigns", icon: "megaphone", tone: "text-yellow-200" },
  { label: "Retention", icon: "gift", tone: "text-pink-200" },
  { label: "Ops Stack", icon: "settings", tone: "text-slate-200" },
] as const;

const platformCards = [
  { title: "Stripe", description: "Payments sync", icon: "credit-card", tone: "text-emerald-200" },
  { title: "Twilio", description: "Voice + SMS", icon: "phone-call", tone: "text-cyan-200" },
  { title: "Google", description: "Calendar + Maps", icon: "calendar-days", tone: "text-sky-200" },
  { title: "Resend", description: "Transactional email", icon: "mail", tone: "text-amber-200" },
  { title: "Clerk", description: "Identity layer", icon: "user-check", tone: "text-lime-200" },
  { title: "Vapi", description: "AI voice agent", icon: "mic", tone: "text-rose-200" },
] as const;

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
  const [actions, setActions] = useState<AIAction[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [runningAgents, setRunningAgents] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [taskData, statsData, actionData] = await Promise.all([
          getAgentTasks({ status: "PENDING", limit: 6 }),
          getDashboardStats(),
          getActions("PENDING"),
        ]);
        setTasks(taskData ?? []);
        setStats(statsData ?? null);
        setActions(actionData ?? []);
      } catch (error) {
        console.error("Failed to load today data", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const displayTasks = useMemo<ActionItem[]>(() => {
    if (actions.length > 0) {
      return actions.map((action) => ({
        id: action.id,
        source: "action",
        title: action.title,
        description: action.description,
        priority: action.riskLevel ?? "MEDIUM",
      }));
    }
    if (tasks.length > 0) {
      return tasks.map((task) => ({
        id: task.id,
        source: "task",
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
      }));
    }
    return fallbackTasks.map((task) => ({ ...task, source: "fallback" }));
  }, [actions, tasks]);

  const refreshQueues = async () => {
    const [taskData, actionData] = await Promise.all([
      getAgentTasks({ status: "PENDING", limit: 6 }),
      getActions("PENDING"),
    ]);
    setTasks(taskData ?? []);
    setActions(actionData ?? []);
  };

  const handleApprove = async (item: ActionItem) => {
    if (!item.id || !item.source) return;
    try {
      setWorkingId(item.id);
      if (item.source === "action") {
        await approveAction(item.id);
      } else if (item.source === "task") {
        await updateAgentTask(item.id, { status: "COMPLETED" });
      }
      await refreshQueues();
    } catch (error) {
      console.error("Failed to approve item", error);
    } finally {
      setWorkingId(null);
    }
  };

  const handleSkip = async (item: ActionItem) => {
    if (!item.id || !item.source) return;
    try {
      setWorkingId(item.id);
      if (item.source === "action") {
        await cancelAction(item.id);
      } else if (item.source === "task") {
        await updateAgentTask(item.id, { status: "CANCELLED" });
      }
      await refreshQueues();
    } catch (error) {
      console.error("Failed to skip item", error);
    } finally {
      setWorkingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (displayTasks.length === 0) return;
    try {
      setWorkingId("bulk");
      await Promise.all(
        displayTasks.map((item) => {
          if (!item.id || !item.source) return Promise.resolve();
          if (item.source === "action") {
            return approveAction(item.id);
          }
          if (item.source === "task") {
            return updateAgentTask(item.id, { status: "COMPLETED" });
          }
          return Promise.resolve();
        }),
      );
      await refreshQueues();
    } catch (error) {
      console.error("Failed to approve all items", error);
    } finally {
      setWorkingId(null);
    }
  };

  const handleRunAgents = async () => {
    try {
      setRunningAgents(true);
      await triggerAllAgents();
      await refreshQueues();
    } catch (error) {
      console.error("Failed to run agents", error);
    } finally {
      setRunningAgents(false);
    }
  };

  const formatCurrency = (value?: number) =>
    typeof value === "number" ? value.toLocaleString() : "--";

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">
            System online
          </span>
          <span className="font-primary text-emerald-200/80">
            &gt; ./business-os --run-agent
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-4xl font-semibold text-slate-100 sm:text-5xl">
            Build Your{" "}
            <span className="bg-gradient-to-r from-violet-300 via-sky-200 to-emerald-200 bg-clip-text text-transparent">
              Business OS
            </span>
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Track every lead, booking, invoice, and customer signal in one place.
            Your AI employee orchestrates the work while you stay in control.
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {getGreeting()} - {formatDate()}
          </p>
        </div>
      </section>

      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Command matrix</p>
            <h2 className="mt-2 font-display text-lg text-slate-100">Departments online</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">
            {systemModules.length} modules active
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {systemModules.map((module) => (
            <div key={module.label} className="icon-tile rounded-2xl px-3 py-4 text-center">
              <div
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${module.tone}`}
              >
                <Icon name={module.icon} size={18} />
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-200">{module.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {platformCards.map((card) => (
          <div key={card.title} className="glass-panel rounded-2xl px-4 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ${card.tone}`}>
                <Icon name={card.icon} size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">{card.title}</p>
                <p className="text-xs text-slate-400">{card.description}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority queue</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">AI-ready actions</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleApproveAll}
                disabled={workingId === "bulk"}
                className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-400/60 disabled:opacity-60"
              >
                {workingId === "bulk" ? "Approving..." : "Approve all"}
              </button>
              <button
                onClick={handleRunAgents}
                disabled={runningAgents}
                className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
              >
                {runningAgents ? "Running AI..." : "Run AI now"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon name="loader-2" size={16} className="animate-spin" />
                Loading today&apos;s queue...
              </div>
            ) : (
              displayTasks.map((item, index) => (
                <div
                  key={item.id ?? `${item.title}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      {item.priority ?? "MEDIUM"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={workingId === item.id}
                      className="rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {workingId === item.id ? "Working..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleSkip(item)}
                      disabled={workingId === item.id}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/30 disabled:opacity-60"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Business pulse</p>
            <h2 className="mt-2 font-display text-lg text-slate-100">Signal summary</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Revenue</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                ${formatCurrency(stats?.revenue?.current)}
              </p>
              <p className="text-xs text-emerald-200">{stats?.revenue?.change ?? 0}% vs last month</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Appointments</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                {stats?.appointments?.current ?? "--"}
              </p>
              <p className="text-xs text-slate-400">This month</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quotes pending</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                {stats?.quotes?.pending ?? "--"}
              </p>
              <p className="text-xs text-slate-400">Ready for follow-up</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Jobs active</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                {stats?.jobs?.inProgress ?? "--"}
              </p>
              <p className="text-xs text-slate-400">Running today</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Next focus</p>
            <p className="mt-2 text-sm text-slate-200">
              Keep collections warm, tighten booking gaps, and ship five-star review requests.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
