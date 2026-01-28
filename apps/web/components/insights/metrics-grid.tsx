'use client';

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
}

function MetricCard({ label, value, change, icon }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      {change !== undefined && (
        <div
          className={cn(
            'mt-2 flex items-center gap-1 text-sm',
            isPositive ? 'text-green-500' : 'text-red-500'
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
          <span className="text-muted-foreground">vs last week</span>
        </div>
      )}
    </div>
  );
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
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
        icon={<DollarSign className="h-5 w-5" />}
      />
      <MetricCard
        label="Jobs Completed"
        value={metrics.jobsCompleted.toString()}
        icon={<Briefcase className="h-5 w-5" />}
      />
      <MetricCard
        label="Completion Rate"
        value={`${metrics.appointmentCompletionRate.toFixed(0)}%`}
        icon={<CheckCircle className="h-5 w-5" />}
      />
      <MetricCard
        label="NPS Score"
        value={metrics.npsScore.toString()}
        icon={<ThumbsUp className="h-5 w-5" />}
      />
    </div>
  );
}
