"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AgentInsight,
  InsightSummary,
  getInsights,
  getInsightsSummary,
  updateInsightStatus,
  getAgentLabel,
  getPriorityIcon,
} from "@/lib/api/insights";

interface InsightsPanelProps {
  maxItems?: number;
}

export function InsightsPanel({ maxItems = 5 }: InsightsPanelProps) {
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [insightsData, summaryData] = await Promise.all([
        getInsights({ status: "PENDING", limit: maxItems }),
        getInsightsSummary(),
      ]);
      setInsights(insightsData.insights);
      setSummary(summaryData);
    } catch (error) {
      console.error("Failed to load insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (insight: AgentInsight, action: "APPROVED" | "REJECTED") => {
    try {
      setActionLoading(insight.id);
      await updateInsightStatus(insight.id, action);
      setInsights((prev) => prev.filter((i) => i.id !== insight.id));
      if (summary) {
        setSummary({
          ...summary,
          byStatus: {
            ...summary.byStatus,
            PENDING: summary.byStatus.PENDING - 1,
            [action]: summary.byStatus[action] + 1,
          },
          pendingUrgent:
            insight.priority === "URGENT"
              ? summary.pendingUrgent - 1
              : summary.pendingUrgent,
          pendingHigh:
            insight.priority === "HIGH"
              ? summary.pendingHigh - 1
              : summary.pendingHigh,
        });
      }
    } catch (error) {
      console.error("Failed to update insight:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalPending = summary?.byStatus.PENDING ?? 0;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
          {totalPending > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {totalPending} pending
            </span>
          )}
          {summary && summary.pendingUrgent > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {summary.pendingUrgent} urgent
            </span>
          )}
        </div>
        <Link
          href="/dashboard/insights"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View All
        </Link>
      </div>

      <div className="divide-y divide-gray-100">
        {insights.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p className="text-sm">No pending insights</p>
            <p className="text-xs mt-1">AI agents are analyzing your business data</p>
          </div>
        ) : (
          insights.map((insight) => (
            <div key={insight.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg" title={insight.priority}>
                      {getPriorityIcon(insight.priority)}
                    </span>
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {insight.priority}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {insight.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {insight.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {getAgentLabel(insight.agentType)} &bull;{" "}
                    {Math.round(insight.confidenceScore * 100)}% confidence
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(insight, "APPROVED")}
                    disabled={actionLoading === insight.id}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {insight.actionLabel}
                  </button>
                  <button
                    onClick={() => handleAction(insight, "REJECTED")}
                    disabled={actionLoading === insight.id}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {insights.length > 0 && totalPending > maxItems && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <Link
            href="/dashboard/insights"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View {totalPending - insights.length} more insights
          </Link>
        </div>
      )}
    </div>
  );
}
