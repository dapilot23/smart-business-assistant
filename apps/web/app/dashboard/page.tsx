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

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border-subtle bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {getGreeting()}, here is what matters today.
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate()}</p>
        </div>
          <button
            onClick={handleRunAgents}
            disabled={runningAgents}
            className="rounded-full border border-border-subtle bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            {runningAgents ? "Running AI..." : "Run AI now"}
          </button>
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
            <button
              onClick={handleApproveAll}
              disabled={workingId === "bulk"}
              className="rounded-full border border-border-subtle bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
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
                      <button
                        onClick={() => handleApprove(task)}
                        disabled={workingId === task.id}
                        className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button className="rounded-full border border-border-subtle bg-card px-4 py-1.5 text-xs font-semibold text-foreground">
                        Edit
                      </button>
                      <button
                        onClick={() => handleSkip(task)}
                        disabled={workingId === task.id}
                        className="rounded-full border border-border-subtle bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-60"
                      >
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
            Running behind-the-scenes tasks so you do not have to.
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
