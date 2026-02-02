"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAgentTasks, updateAgentTask } from "@/lib/api/agent-tasks";
import { approveAction, cancelAction, getActions, type AIAction } from "@/lib/api/ai-actions";
import { getDashboardStats, type DashboardStats } from "@/lib/api/reports";
import type { AgentTask } from "@/lib/types/agent-task";
import { AskBar } from "./_components/ask-bar";

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

  const refreshQueues = async () => {
    const [taskData, actionData] = await Promise.all([
      getAgentTasks({ status: "PENDING", limit: 8 }),
      getActions("PENDING"),
    ]);
    setTasks(taskData ?? []);
    setActions(actionData ?? []);
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      setWorkingId(actionId);
      await approveAction(actionId);
      await refreshQueues();
    } catch (error) {
      console.error("Failed to approve action", error);
    } finally {
      setWorkingId(null);
    }
  };

  const handleDeclineAction = async (actionId: string) => {
    try {
      setWorkingId(actionId);
      await cancelAction(actionId);
      await refreshQueues();
    } catch (error) {
      console.error("Failed to decline action", error);
    } finally {
      setWorkingId(null);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setWorkingId(taskId);
      await updateAgentTask(taskId, { status: "COMPLETED" });
      await refreshQueues();
    } catch (error) {
      console.error("Failed to complete task", error);
    } finally {
      setWorkingId(null);
    }
  };

  const handleSkipTask = async (taskId: string) => {
    try {
      setWorkingId(taskId);
      await updateAgentTask(taskId, { status: "CANCELLED" });
      await refreshQueues();
    } catch (error) {
      console.error("Failed to skip task", error);
    } finally {
      setWorkingId(null);
    }
  };

  const primaryActions = useMemo(() => actions.slice(0, 3), [actions]);
  const secondaryTasks = useMemo(() => tasks.slice(0, 5), [tasks]);

  const statusText = loading ? "Loading..." : `${actions.length} actions waiting`;
  const weekRange = formatWeekRange();

  const revenueChange =
    typeof stats?.revenue?.change === "number"
      ? `${stats.revenue.change}% vs last month`
      : "No trend yet";

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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Insights</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">Key signals</h2>
            </div>
            <Link
              href="/dashboard/insights"
              className="text-xs font-semibold text-emerald-200 hover:text-emerald-100"
            >
              View report
            </Link>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Revenue</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                ${formatCurrency(stats?.revenue?.current)}
              </p>
              <p className="text-xs text-slate-400">{revenueChange}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Appointments</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                {stats?.appointments?.current ?? "--"}
              </p>
              <p className="text-xs text-slate-400">This month</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quotes waiting</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                {stats?.quotes?.pending ?? "--"}
              </p>
              <p className="text-xs text-slate-400">Need follow-up</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
