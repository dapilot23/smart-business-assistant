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
import { Button } from "@/components/ui/button";
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
    <div className="container py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Actions</h1>
          <p className="text-muted-foreground mt-1">
            Review, approve, and track automated actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.label}
              variant={filter === item.value ? "default" : "outline"}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => loadActions(filter)}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading actions...
        </div>
      ) : actions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          No actions to show.
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action) => (
            <div
              key={action.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getActionStatusColor(action.status)}>
                      {action.status}
                    </Badge>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {getActionTypeLabel(action.actionType)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                  {action.estimatedImpact && (
                    <p className="text-xs text-muted-foreground">
                      Impact: {action.estimatedImpact}
                    </p>
                  )}
                  {action.errorMessage && (
                    <p className="text-xs text-destructive">
                      Error: {action.errorMessage}
                    </p>
                  )}
                </div>
                {action.status === "PENDING" && (
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleApprove(action.id)}>
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCancel(action.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Created {new Date(action.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
