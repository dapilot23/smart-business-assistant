'use client';

import { memo } from 'react';
import {
  DollarSign,
  Briefcase,
  CheckCircle,
  ThumbsUp,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { ReportKeyMetrics } from '@/lib/types/weekly-report';
import { cn } from '@/lib/utils';

interface MetricsGridProps {
  metrics: ReportKeyMetrics;
}

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  tone?: string;
}

const MetricCard = memo(function MetricCard({ label, value, change, icon, tone }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {label}
        </span>
        <div className={`rounded-full border border-white/10 bg-white/5 p-2 ${tone ?? 'text-emerald-200'}`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-100">{value}</p>
      {change !== undefined && (
        <div
          className={cn(
            'mt-2 flex items-center gap-1 text-xs',
            isPositive ? 'text-emerald-300' : 'text-rose-300'
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>
            {isPositive ? '+' : ''}
            {change.toFixed(1)}%
          </span>
          <span className="text-slate-500">vs last week</span>
        </div>
      )}
    </div>
  );
});

export const MetricsGrid = memo(function MetricsGrid({ metrics }: MetricsGridProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Revenue"
        value={formatCurrency(metrics.revenue)}
        change={metrics.revenueChange}
        icon={<DollarSign className="h-4 w-4" />}
        tone="text-emerald-200"
      />
      <MetricCard
        label="Jobs Completed"
        value={metrics.jobsCompleted.toString()}
        icon={<Briefcase className="h-4 w-4" />}
        tone="text-sky-200"
      />
      <MetricCard
        label="Completion Rate"
        value={`${metrics.appointmentCompletionRate.toFixed(0)}%`}
        icon={<CheckCircle className="h-4 w-4" />}
        tone="text-indigo-200"
      />
      <MetricCard
        label="NPS Score"
        value={metrics.npsScore.toString()}
        icon={<ThumbsUp className="h-4 w-4" />}
        tone="text-amber-200"
      />
    </div>
  );
});
