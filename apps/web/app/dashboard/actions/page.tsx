"use client";

import { useEffect, useState } from "react";
import {
  approveAction,
  cancelAction,
  getActions,
  getActionStatusColor,
  getActionTypeLabel,
  type AIAction,
  type ActionStatus,
} from "@/lib/api/ai-actions";
import { Badge } from "@/components/ui/badge";

const FILTERS: Array<{ label: string; value?: ActionStatus }> = [
  { label: "Pending", value: "PENDING" },
  { label: "All" },
];

export default function ActionsPage() {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActionStatus | undefined>("PENDING");
  const [error, setError] = useState<string | null>(null);

  const loadActions = async (status?: ActionStatus) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getActions(status);
      setActions(data);
    } catch (err) {
      console.error("Failed to load actions:", err);
      setError("Unable to load actions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions(filter);
  }, [filter]);

  const handleApprove = async (actionId: string) => {
    try {
      await approveAction(actionId);
      await loadActions(filter);
    } catch (err) {
      console.error("Failed to approve action:", err);
      setError("Failed to approve action.");
    }
  };

  const handleCancel = async (actionId: string) => {
    try {
      await cancelAction(actionId);
      await loadActions(filter);
    } catch (err) {
      console.error("Failed to cancel action:", err);
      setError("Failed to cancel action.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Actions</h1>
          <p className="text-sm text-slate-400">Approve or skip what the AI wants to do.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const isActive = filter === item.value;
            return (
              <button
                key={item.label}
                onClick={() => setFilter(item.value)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                  isActive
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => loadActions(filter)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-white/20"
          >
            Reload
          </button>
        </div>
      </section>

      <section className="glass-panel rounded-3xl p-6">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
            Loading actions...
          </div>
        ) : actions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
            No actions to show.
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map((action) => (
              <div
                key={action.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`${getActionStatusColor(action.status)} text-[10px] uppercase tracking-[0.2em]`}>
                        {action.status}
                      </Badge>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {getActionTypeLabel(action.actionType)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {action.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {action.description}
                    </p>
                    {action.estimatedImpact && (
                      <p className="text-xs text-slate-500">
                        Impact: {action.estimatedImpact}
                      </p>
                    )}
                    {action.errorMessage && (
                      <p className="text-xs text-rose-200">
                        Error: {action.errorMessage}
                      </p>
                    )}
                  </div>
                  {action.status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(action.id)}
                        className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleCancel(action.id)}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-white/20"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  Created {new Date(action.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}
