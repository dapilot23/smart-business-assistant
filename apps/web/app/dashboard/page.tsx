"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  approveTaskLedger,
  completeTaskLedger,
  createTaskLedger,
  declineTaskLedger,
  getCommandCenterDashboard,
  type ApprovalItem,
  type CommandCenterDashboard,
  type DashboardSignal,
  type OneTapWin,
  type QuickAction,
  type TaskItem,
} from "@/lib/api/command-center";
import { fetchWithAuth, getApiUrl } from "@/lib/api/client";
import { AskBar } from "./_components/ask-bar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Icon } from "@/app/components/Icon";

type SignalConfig = {
  id: "revenue" | "appointments" | "quotes";
  enabled: boolean;
};

type SignalDefinition = {
  id: SignalConfig["id"];
  label: string;
  value: string;
  note: string;
};

const SIGNAL_ICON_MAP: Record<string, Parameters<typeof Icon>[0]["name"]> = {
  "calendar-alert": "calendar-days",
  "dollar-alert": "dollar-sign",
  "file-text": "file-text",
  star: "sparkles",
  success: "check",
  warning: "alert-circle",
};

const SIGNAL_PRIORITY_STYLES: Record<DashboardSignal["priority"], string> = {
  high: "border-rose-400/30 bg-rose-400/5",
  medium: "border-amber-400/30 bg-amber-400/5",
  low: "border-emerald-400/30 bg-emerald-400/5",
};

type IconName = Parameters<typeof Icon>[0]["name"];

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
  const [dashboard, setDashboard] = useState<CommandCenterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [workingQuickAction, setWorkingQuickAction] = useState<string | null>(null);
  const [signalConfig, setSignalConfig] = useState<SignalConfig[]>([
    ...DEFAULT_SIGNAL_CONFIG,
  ]);
  const primaryApprovalsRef = useRef<ApprovalItem[]>([]);
  const workingIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const dashboardData = await getCommandCenterDashboard({
          approvalsLimit: 3,
          tasksLimit: 5,
        });
        setDashboard(dashboardData ?? null);
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

  const refreshDashboard = useCallback(async () => {
    const dashboardData = await getCommandCenterDashboard({
      approvalsLimit: 3,
      tasksLimit: 5,
    });
    setDashboard(dashboardData ?? null);
  }, []);

  const handleRunPrompt = useCallback(
    async (prompt: string) => {
      try {
        await createTaskLedger({
          type: "APPROVAL",
          category: "OPERATIONS",
          title: prompt,
          description: "Requested via Ask Bar",
          icon: "sparkles",
          actionType: "ASK_BAR",
          payload: { prompt, source: "ask-bar" },
        });
        await refreshDashboard();
      } catch (error) {
        console.error("Failed to run prompt", error);
      }
    },
    [refreshDashboard]
  );

  const handleApproveAction = useCallback(
    async (actionId: string) => {
      try {
        setWorkingId(actionId);
        await approveTaskLedger(actionId);
        await refreshDashboard();
      } catch (error) {
        console.error("Failed to approve action", error);
      } finally {
        setWorkingId(null);
      }
    },
    [refreshDashboard]
  );

  const handleDeclineAction = useCallback(
    async (actionId: string) => {
      try {
        setWorkingId(actionId);
        await declineTaskLedger(actionId, "Declined in Command Center");
        await refreshDashboard();
      } catch (error) {
        console.error("Failed to decline action", error);
      } finally {
        setWorkingId(null);
      }
    },
    [refreshDashboard]
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      try {
        setWorkingId(taskId);
        await completeTaskLedger(taskId);
        await refreshDashboard();
      } catch (error) {
        console.error("Failed to complete task", error);
      } finally {
        setWorkingId(null);
      }
    },
    [refreshDashboard]
  );

  const handleSkipTask = useCallback(
    async (taskId: string) => {
      try {
        setWorkingId(taskId);
        await declineTaskLedger(taskId, "Skipped in Command Center");
        await refreshDashboard();
      } catch (error) {
        console.error("Failed to skip task", error);
      } finally {
        setWorkingId(null);
      }
    },
    [refreshDashboard]
  );

  const primaryApprovals = useMemo<ApprovalItem[]>(
    () => dashboard?.approvals ?? [],
    [dashboard]
  );
  const secondaryTasks = useMemo<TaskItem[]>(
    () => dashboard?.tasks ?? [],
    [dashboard]
  );
  const quickActions = useMemo<QuickAction[]>(
    () => dashboard?.quickActions ?? [],
    [dashboard]
  );
  const oneTapWin = dashboard?.oneTapWin ?? null;

  useEffect(() => {
    primaryApprovalsRef.current = primaryApprovals;
  }, [primaryApprovals]);

  useEffect(() => {
    workingIdRef.current = workingId;
  }, [workingId]);

  useEffect(() => {
    const handleApproveNext = () => {
      if (workingIdRef.current) return;
      const next = primaryApprovalsRef.current[0];
      if (next) {
        handleApproveAction(next.id);
      }
    };

    const handleDeclineNext = () => {
      if (workingIdRef.current) return;
      const next = primaryApprovalsRef.current[0];
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

  const approvalsCount = dashboard?.taskStats?.approvals ?? primaryApprovals.length;
  const tasksCount = dashboard?.taskStats?.pending ?? secondaryTasks.length;
  const attentionSignals = useMemo<DashboardSignal[]>(
    () => dashboard?.signals ?? [],
    [dashboard]
  );
  const statusText = loading
    ? "Loading..."
    : `${approvalsCount} approvals • ${tasksCount} tasks`;
  const weekRange = formatWeekRange();

  const metrics = dashboard?.metrics;
  const statusBar = dashboard?.statusBar;
  const greeting = statusBar?.greeting ?? "Welcome back";
  const todayAppointments =
    typeof statusBar?.todayAppointments === "number" ? statusBar.todayAppointments : "--";
  const outstandingAmount =
    typeof statusBar?.outstandingAmount === "number"
      ? `$${formatCurrency(statusBar.outstandingAmount)}`
      : "--";
  const pulseScore =
    typeof statusBar?.businessPulseScore === "number" ? statusBar.businessPulseScore : "--";
  const pulseTrend = statusBar?.trend ?? "stable";
  const pulseIcon =
    pulseTrend === "up" ? "trending-up" : pulseTrend === "down" ? "trending-down" : "bar-chart-3";

  const handleQuickAction = useCallback(
    async (action: QuickAction, actionId?: string) => {
      if (action.confirmation && !window.confirm(action.confirmation)) return;
      const id = actionId ?? action.id;
      try {
        setWorkingQuickAction(id);
        const url = getApiUrl(action.endpoint);
        const options: RequestInit = {
          method: action.method,
        };
        if (action.method !== "GET") {
          options.body = JSON.stringify(action.payload ?? {});
        }
        await fetchWithAuth(url, options);
        await refreshDashboard();
      } catch (error) {
        console.error("Failed to run quick action", error);
      } finally {
        setWorkingQuickAction(null);
      }
    },
    [refreshDashboard]
  );

  const handleOneTapWin = useCallback(
    async (win: OneTapWin) => {
      const id = win.id;
      try {
        setWorkingQuickAction(id);
        const url = getApiUrl(win.action.endpoint);
        const options: RequestInit = {
          method: win.action.method,
        };
        if (win.action.method !== "GET") {
          options.body = JSON.stringify(win.action.payload ?? {});
        }
        const created = await fetchWithAuth(url, options);
        if (win.action.endpoint === "/task-ledger" && win.action.method === "POST") {
          const taskId = created && typeof created === "object" ? (created as { id?: string }).id : undefined;
          if (taskId) {
            await approveTaskLedger(taskId);
          }
        }
        await refreshDashboard();
      } catch (error) {
        console.error("Failed to run one-tap win", error);
      } finally {
        setWorkingQuickAction(null);
      }
    },
    [refreshDashboard]
  );
  const revenueNote =
    typeof metrics?.todayRevenueTarget === "number"
      ? `Target $${formatCurrency(metrics.todayRevenueTarget)}`
      : "Today";
  const quotesNote =
    typeof metrics?.pendingQuotesAmount === "number"
      ? `$${formatCurrency(metrics.pendingQuotesAmount)} pending`
      : "Need follow-up";

  const signalDefinitions = useMemo<SignalDefinition[]>(
    () => [
      {
        id: "revenue" as const,
        label: SIGNAL_LABELS.revenue,
        value:
          typeof metrics?.todayRevenue === "number"
            ? `$${formatCurrency(metrics.todayRevenue)}`
            : "--",
        note: revenueNote,
      },
      {
        id: "appointments" as const,
        label: SIGNAL_LABELS.appointments,
        value:
          typeof statusBar?.todayAppointments === "number"
            ? `${statusBar.todayAppointments}`
            : "--",
        note: "Today",
      },
      {
        id: "quotes" as const,
        label: SIGNAL_LABELS.quotes,
        value:
          typeof metrics?.pendingQuotesCount === "number"
            ? `${metrics.pendingQuotesCount}`
            : "--",
        note: quotesNote,
      },
    ],
    [metrics?.pendingQuotesCount, metrics?.todayRevenue, statusBar?.todayAppointments, quotesNote, revenueNote]
  );

  const signalMap = useMemo(() => {
    return new Map(signalDefinitions.map((signal) => [signal.id, signal]));
  }, [signalDefinitions]);

  const visibleSignals = useMemo(() => {
    return signalConfig
      .filter((config) => config.enabled)
      .map((config) => signalMap.get(config.id))
      .filter((signal): signal is SignalDefinition => Boolean(signal));
  }, [signalConfig, signalMap]);

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
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Command center</p>
          <h1 className="mt-2 font-display text-3xl text-slate-100 sm:text-4xl">{greeting}</h1>
          <p className="text-sm text-slate-400">Approve the next steps and move on.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
          <span className="text-slate-200">Queue:</span>
          <span>{statusText}</span>
          <span className="text-slate-600">|</span>
          <span>Today:</span>
          <span className="text-slate-200">{todayAppointments} appts</span>
          <span className="text-slate-600">|</span>
          <span>Outstanding:</span>
          <span className="text-slate-200">{outstandingAmount}</span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-slate-200">
            <Icon name={pulseIcon} size={12} className="text-emerald-300" />
            Pulse {pulseScore}
          </span>
          <span className="text-slate-600">|</span>
          <span>Range:</span>
          <span className="text-slate-200">{weekRange}</span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Primary queue</p>
                <h2 className="mt-2 font-display text-lg text-slate-100">Top approvals</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {approvalsCount}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {loading ? (
                <div className="text-sm text-slate-400">Loading approvals...</div>
              ) : primaryApprovals.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                  No approvals waiting.
                </div>
              ) : (
                primaryApprovals.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-slate-100">{action.title}</p>
                    {action.description && (
                      <p className="mt-1 text-xs text-slate-400">{action.description}</p>
                    )}
                    {typeof action.aiConfidence === "number" && (
                      <p className="mt-2 text-xs text-slate-500">
                        Confidence: {Math.round(action.aiConfidence * 100)}%
                      </p>
                    )}
                    {action.aiReasoning && (
                      <p className="mt-1 text-xs text-slate-500">Why: {action.aiReasoning}</p>
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
                {tasksCount}
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

          {oneTapWin && (
            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-full border border-white/10 bg-white/10 p-2">
                    <Icon
                      name={
                        (oneTapWin.entityType === "invoice"
                          ? "dollar-sign"
                          : oneTapWin.entityType === "appointment"
                          ? "calendar-days"
                          : oneTapWin.entityType === "quote"
                          ? "file-text"
                          : "sparkles") as IconName
                      }
                      size={18}
                      className="text-emerald-200"
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      One tap win
                    </p>
                    <h2 className="mt-2 font-display text-lg text-slate-100">
                      {oneTapWin.headline}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">{oneTapWin.subtext}</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {oneTapWin.impact.label}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleOneTapWin(oneTapWin)}
                  disabled={workingQuickAction === oneTapWin.id}
                  className="rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                >
                  {workingQuickAction === oneTapWin.id ? "Working..." : oneTapWin.action.label}
                </button>
                {typeof oneTapWin.impact.revenue === "number" && (
                  <span className="text-xs text-slate-500">
                    Potential impact: ${formatCurrency(oneTapWin.impact.revenue)}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Shortcuts</p>
                <h2 className="mt-2 font-display text-lg text-slate-100">Quick actions</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {quickActions.length}
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {quickActions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                  No quick actions right now.
                </div>
              ) : (
                quickActions.map((action) => {
                  const iconName = (action.icon as IconName) || "sparkles";
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleQuickAction(action)}
                      disabled={workingQuickAction === action.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-100 hover:border-white/20 disabled:opacity-60"
                    >
                      <span className="flex items-center gap-3">
                        <span className="rounded-full border border-white/10 bg-white/10 p-2">
                          <Icon name={iconName} size={16} className="text-slate-100" />
                        </span>
                        {action.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {workingQuickAction === action.id ? "Working..." : "Queue"}
                      </span>
                    </button>
                  );
                })
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
                onRun={handleRunPrompt}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Insights</p>
                <h2 className="mt-2 font-display text-lg text-slate-100">Key metrics</h2>
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
                        Customize metrics
                      </DialogTitle>
                      <p className="text-sm text-slate-400">
                        Show, hide, and reorder the dashboard metrics.
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
                  No metrics selected.
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

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Signals</p>
                <h2 className="mt-2 font-display text-lg text-slate-100">Attention needed</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {attentionSignals.length}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {loading ? (
                <div className="text-sm text-slate-400">Loading signals...</div>
              ) : attentionSignals.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                  No signals requiring attention.
                </div>
              ) : (
                attentionSignals.map((signal) => {
                  const iconName =
                    SIGNAL_ICON_MAP[signal.icon] ?? SIGNAL_ICON_MAP[signal.type.toLowerCase()] ?? "alert-circle";
                  return (
                    <div
                      key={signal.id}
                      className={`rounded-2xl border px-4 py-4 ${SIGNAL_PRIORITY_STYLES[signal.priority]}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 rounded-full border border-white/10 bg-white/10 p-2">
                          <Icon name={iconName} size={16} className="text-slate-100" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-100">{signal.title}</p>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {signal.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{signal.detail}</p>
                          {signal.action?.label && (
                            <p className="mt-2 text-xs text-slate-500">
                              Next: {signal.action.label}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
