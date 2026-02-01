'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  Send,
  MousePointer,
  TrendingUp,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  getReputationDashboard,
  ReputationDashboard,
} from '@/lib/api/review-requests';
import { cn } from '@/lib/utils';

interface ReviewPipelineProps {
  className?: string;
}

const platformIcons: Record<string, string> = {
  google: 'G',
  yelp: 'Y',
  facebook: 'f',
  unknown: '?',
};

const platformColors: Record<string, string> = {
  google: 'bg-blue-500',
  yelp: 'bg-red-500',
  facebook: 'bg-indigo-600',
  unknown: 'bg-gray-400',
};

function StatCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-white/10 bg-white/5 p-2 text-emerald-200">
          {icon}
        </div>
        <div>
          <p className="text-xl font-semibold text-slate-100">{value}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
          {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'CLICKED':
      return 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-200';
    case 'SENT':
      return 'border border-sky-400/40 bg-sky-400/10 text-sky-200';
    case 'PENDING':
      return 'border border-amber-400/40 bg-amber-400/10 text-amber-200';
    case 'SKIPPED':
      return 'border border-white/10 bg-white/5 text-slate-300';
    default:
      return 'border border-white/10 bg-white/5 text-slate-300';
  }
}

export function ReviewPipeline({ className }: ReviewPipelineProps) {
  const [data, setData] = useState<ReputationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboard = await getReputationDashboard();
      setData(dashboard);
    } catch (err) {
      console.error('Failed to load reputation data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const containerClass = cn('glass-panel rounded-3xl p-6', className);

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-emerald-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reputation</p>
            <h3 className="mt-2 font-display text-lg text-slate-100">Review pipeline</h3>
          </div>
        </div>
        <div className="mt-5 animate-pulse space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
          <div className="h-32 rounded-2xl border border-white/10 bg-white/5" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-emerald-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reputation</p>
            <h3 className="mt-2 font-display text-lg text-slate-100">Review pipeline</h3>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-rose-200">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-100 hover:border-rose-300/60"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-emerald-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reputation</p>
            <h3 className="mt-2 font-display text-lg text-slate-100">Review pipeline</h3>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
          {data.sentCount} requests
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Requests sent"
          value={data.sentCount}
          icon={<Send className="h-4 w-4" />}
        />
        <StatCard
          label="Reviews clicked"
          value={data.clickedCount}
          icon={<MousePointer className="h-4 w-4" />}
        />
        <StatCard
          label="Click rate"
          value={`${data.clickRate}%`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {data.npsGatedStats.sent > 0 && (
        <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-200" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              NPS gated reviews
            </span>
          </div>
          <p className="mt-2 text-sm text-emerald-100/80">
            {data.npsGatedStats.clicked} of {data.npsGatedStats.sent} happy customers clicked through
            ({data.npsGatedStats.conversionRate}% conversion)
          </p>
        </div>
      )}

      {data.platformBreakdown.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Platform clicks</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {data.platformBreakdown.map((platform) => (
              <div
                key={platform.platform}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white',
                    platformColors[platform.platform] || platformColors.unknown
                  )}
                >
                  {platformIcons[platform.platform] || platform.platform.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-100 capitalize">{platform.platform}</p>
                  <p className="text-xs text-slate-500">{platform.clickCount} clicks</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent requests</p>
        <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
          {data.recentRequests.slice(0, 8).map((request) => (
            <div
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]',
                    getStatusColor(request.status)
                  )}
                >
                  {request.status}
                </span>
                <span className="text-sm font-medium text-slate-100">
                  {request.customer.name}
                </span>
                {request.npsGated && request.npsScore && (
                  <span className="text-xs text-slate-500">NPS: {request.npsScore}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {request.platform && (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {request.platform}
                  </span>
                )}
                <span>{formatDate(request.sentAt || request.createdAt)}</span>
              </div>
            </div>
          ))}
          {data.recentRequests.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No review requests yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
