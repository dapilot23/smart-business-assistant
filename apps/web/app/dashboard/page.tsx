"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getAgentTasks, updateAgentTask } from "@/lib/api/agent-tasks";
import { approveAction, cancelAction, getActions, type AIAction } from "@/lib/api/ai-actions";
import { getDashboardStats, type DashboardStats } from "@/lib/api/reports";
import type { AgentTask } from "@/lib/types/agent-task";
import { AskBar } from "./_components/ask-bar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp } from "lucide-react";

type SignalConfig = {
  id: "revenue" | "appointments" | "quotes";
  enabled: boolean;
};

const DEFAULT_SIGNAL_CONFIG: SignalConfig[] = [
  { id: "revenue", enabled: true },
  { id: "appointments", enabled: true },
  { id: "quotes", enabled: true },
];

const SIGNAL_LABELS: Record<SignalConfig["id"], string> = {
  revenue: "Revenue",
  appointments: "Appointments",
  quotes: "Quotes waiting",
};

function normalizeSignalConfig(raw: unknown): SignalConfig[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SIGNAL_CONFIG];
  const seen = new Set<SignalConfig["id"]>();
  const cleaned: SignalConfig[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as SignalConfig).id;
    if (!SIGNAL_LABELS[id] || seen.has(id)) continue;
    cleaned.push({ id, enabled: Boolean((entry as SignalConfig).enabled) });
    seen.add(id);
  }
  for (const fallback of DEFAULT_SIGNAL_CONFIG) {
    if (!seen.has(fallback.id)) {
      cleaned.push({ ...fallback });
    }
  }
  return cleaned;
}

function formatWeekRange(date = new Date()) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const format = (value: Date) =>
    value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return `${format(start)} - ${format(end)}`;
}

const formatCurrency = (value?: number) =>
  typeof value === "number" ? value.toLocaleString() : "--";

export default function TodayPage() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [actions, setActions] = useState<AIAction[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [signalConfig, setSignalConfig] = useState<SignalConfig[]>([
    ...DEFAULT_SIGNAL_CONFIG,
  ]);
  const primaryActionsRef = useRef<AIAction[]>([]);
  const workingIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [taskData, statsData, actionData] = await Promise.all([
          getAgentTasks({ status: "PENDING", limit: 8 }),
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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("dashboard:signals");
      if (stored) {
        setSignalConfig(normalizeSignalConfig(JSON.parse(stored)));
      }
    } catch (error) {
      console.error("Failed to load dashboard signal config", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("dashboard:signals", JSON.stringify(signalConfig));
    } catch (error) {
      console.error("Failed to save dashboard signal config", error);
    }
  }, [signalConfig]);

  const refreshQueues = useCallback(async () => {
    const [taskData, actionData] = await Promise.all([
      getAgentTasks({ status: "PENDING", limit: 8 }),
      getActions("PENDING"),
    ]);
    setTasks(taskData ?? []);
    setActions(actionData ?? []);
  }, []);

  const handleApproveAction = useCallback(
    async (actionId: string) => {
      try {
        setWorkingId(actionId);
        await approveAction(actionId);
        await refreshQueues();
      } catch (error) {
        console.error("Failed to approve action", error);
      } finally {
        setWorkingId(null);
      }
    },
    [refreshQueues]
  );

  const handleDeclineAction = useCallback(
    async (actionId: string) => {
      try {
        setWorkingId(actionId);
        await cancelAction(actionId);
        await refreshQueues();
      } catch (error) {
        console.error("Failed to decline action", error);
      } finally {
        setWorkingId(null);
      }
    },
    [refreshQueues]
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      try {
        setWorkingId(taskId);
        await updateAgentTask(taskId, { status: "COMPLETED" });
        await refreshQueues();
      } catch (error) {
        console.error("Failed to complete task", error);
      } finally {
        setWorkingId(null);
      }
    },
    [refreshQueues]
  );

  const handleSkipTask = useCallback(
    async (taskId: string) => {
      try {
        setWorkingId(taskId);
        await updateAgentTask(taskId, { status: "CANCELLED" });
        await refreshQueues();
      } catch (error) {
        console.error("Failed to skip task", error);
      } finally {
        setWorkingId(null);
      }
    },
    [refreshQueues]
  );

  const primaryActions = useMemo(() => actions.slice(0, 3), [actions]);
  const secondaryTasks = useMemo(() => tasks.slice(0, 5), [tasks]);

  useEffect(() => {
    primaryActionsRef.current = primaryActions;
  }, [primaryActions]);

  useEffect(() => {
    workingIdRef.current = workingId;
  }, [workingId]);

  useEffect(() => {
    const handleApproveNext = () => {
      if (workingIdRef.current) return;
      const next = primaryActionsRef.current[0];
      if (next) {
        handleApproveAction(next.id);
      }
    };

    const handleDeclineNext = () => {
      if (workingIdRef.current) return;
      const next = primaryActionsRef.current[0];
      if (next) {
        handleDeclineAction(next.id);
      }
    };

    window.addEventListener("command-center:approve-next", handleApproveNext as EventListener);
    window.addEventListener("command-center:decline-next", handleDeclineNext as EventListener);
    return () => {
      window.removeEventListener("command-center:approve-next", handleApproveNext as EventListener);
      window.removeEventListener("command-center:decline-next", handleDeclineNext as EventListener);
    };
  }, [handleApproveAction, handleDeclineAction]);

  const statusText = loading ? "Loading..." : `${actions.length} actions waiting`;
  const weekRange = formatWeekRange();

  const revenueChange =
    typeof stats?.revenue?.change === "number"
      ? `${stats.revenue.change}% vs last month`
      : "No trend yet";

  const signalDefinitions = useMemo(
    () => [
      {
        id: "revenue" as const,
        label: SIGNAL_LABELS.revenue,
        value: `$${formatCurrency(stats?.revenue?.current)}`,
        note: revenueChange,
      },
      {
        id: "appointments" as const,
        label: SIGNAL_LABELS.appointments,
        value: `${stats?.appointments?.current ?? "--"}`,
        note: "This month",
      },
      {
        id: "quotes" as const,
        label: SIGNAL_LABELS.quotes,
        value: `${stats?.quotes?.pending ?? "--"}`,
        note: "Need follow-up",
      },
    ],
    [revenueChange, stats?.appointments?.current, stats?.quotes?.pending, stats?.revenue?.current]
  );

  const signalMap = useMemo(() => {
    return new Map(signalDefinitions.map((signal) => [signal.id, signal]));
  }, [signalDefinitions]);

  const visibleSignals = useMemo(() => {
    return signalConfig
      .filter((config) => config.enabled)
      .map((config) => signalMap.get(config.id))
      .filter((signal): signal is (typeof signalDefinitions)[number] => Boolean(signal));
  }, [signalConfig, signalMap, signalDefinitions]);

  const toggleSignal = useCallback((id: SignalConfig["id"]) => {
    setSignalConfig((prev) =>
      prev.map((config) =>
        config.id === id ? { ...config, enabled: !config.enabled } : config
      )
    );
  }, []);

  const moveSignal = useCallback((id: SignalConfig["id"], direction: "up" | "down") => {
    setSignalConfig((prev) => {
      const index = prev.findIndex((config) => config.id === id);
      if (index === -1) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }, []);

  const resetSignals = useCallback(() => {
    setSignalConfig([...DEFAULT_SIGNAL_CONFIG]);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
          <span className="text-slate-200">Status:</span>
          <span>{statusText}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-200">Range:</span>
          <span>{weekRange}</span>
        </div>
        <div>
          <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Today</h1>
          <p className="text-sm text-slate-400">Approve the next steps and move on.</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Primary queue</p>
                <h2 className="mt-2 font-display text-lg text-slate-100">Top actions</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {primaryActions.length}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {loading ? (
                <div className="text-sm text-slate-400">Loading actions...</div>
              ) : primaryActions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                  No actions waiting.
                </div>
              ) : (
                primaryActions.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-slate-100">{action.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{action.description}</p>
                    {action.estimatedImpact && (
                      <p className="mt-2 text-xs text-slate-500">Impact: {action.estimatedImpact}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleApproveAction(action.id)}
                        disabled={workingId === action.id}
                        className="rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                      >
                        {workingId === action.id ? "Working..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleDeclineAction(action.id)}
                        disabled={workingId === action.id}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/30 disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Secondary queue</p>
                <h2 className="mt-2 font-display text-lg text-slate-100">Next tasks</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {secondaryTasks.length}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {loading ? (
                <div className="text-sm text-slate-400">Loading tasks...</div>
              ) : secondaryTasks.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                  No tasks right now.
                </div>
              ) : (
                secondaryTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                    {task.description && (
                      <p className="mt-1 text-xs text-slate-400">{task.description}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={workingId === task.id}
                        className="rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                      >
                        {workingId === task.id ? "Working..." : "Done"}
                      </button>
                      <button
                        onClick={() => handleSkipTask(task.id)}
                        disabled={workingId === task.id}
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
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Command center</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">Ask the AI to act</h2>
              <p className="mt-1 text-xs text-slate-400">
                One line is enough. Approvals still come to you.
              </p>
            </div>
            <div className="mt-4">
              <AskBar
                suggestions={[
                  "Send overdue invoices",
                  "Follow up new leads",
                  "Close open tickets",
                ]}
              />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Insights</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">Key signals</h2>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 hover:border-white/30">
                    Customize
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md border border-white/10 bg-[#0b0d12] text-slate-100">
                  <DialogHeader>
                    <DialogTitle className="font-display text-lg text-slate-100">
                      Customize signals
                    </DialogTitle>
                    <p className="text-sm text-slate-400">
                      Show, hide, and reorder the dashboard signals.
                    </p>
                  </DialogHeader>
                  <div className="mt-2 space-y-3">
                    {signalConfig.map((signal, index) => (
                      <div
                        key={signal.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-100">
                            {SIGNAL_LABELS[signal.id]}
                          </p>
                          <p className="text-xs text-slate-500">Widget</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveSignal(signal.id, "up")}
                            disabled={index === 0}
                            className="rounded-full border border-white/10 bg-white/5 p-1 text-slate-300 disabled:opacity-40"
                            aria-label="Move up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSignal(signal.id, "down")}
                            disabled={index === signalConfig.length - 1}
                            className="rounded-full border border-white/10 bg-white/5 p-1 text-slate-300 disabled:opacity-40"
                            aria-label="Move down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <Switch
                            checked={signal.enabled}
                            onCheckedChange={() => toggleSignal(signal.id)}
                            className="bg-white/10"
                            aria-label={`Toggle ${SIGNAL_LABELS[signal.id]}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={resetSignals}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-200"
                    >
                      Reset defaults
                    </button>
                    <p className="text-xs text-slate-500">Changes save instantly.</p>
                  </div>
                </DialogContent>
              </Dialog>
              <Link
                href="/dashboard/insights"
                className="text-xs font-semibold text-emerald-200 hover:text-emerald-100"
              >
                View report
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {visibleSignals.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                No signals selected.
              </div>
            ) : (
              visibleSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {signal.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">{signal.value}</p>
                  <p className="text-xs text-slate-400">{signal.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
