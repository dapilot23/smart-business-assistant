'use client';

import { memo } from 'react';
import Link from 'next/link';
import { BarChart3, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { WeeklyReport } from '@/lib/types/weekly-report';
import { cn } from '@/lib/utils';

interface ReportCardProps {
  report: WeeklyReport | null;
  isLoading?: boolean;
}

export const ReportCard = memo(function ReportCard({ report, isLoading }: ReportCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="mt-4 h-8 w-24 bg-muted rounded" />
        <div className="mt-2 h-4 w-48 bg-muted rounded" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Weekly Insights</h3>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          No reports generated yet
        </p>
        <Link
          href="/dashboard/insights"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Generate your first report
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const { keyMetrics } = report.report;
  const isPositive =
    keyMetrics.revenueChange !== undefined && keyMetrics.revenueChange >= 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Weekly Insights</h3>
        </div>
        <Link
          href="/dashboard/insights"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View full report
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4">
        <p className="text-3xl font-bold">{formatCurrency(keyMetrics.revenue)}</p>
        {keyMetrics.revenueChange !== undefined && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-sm',
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
              {keyMetrics.revenueChange.toFixed(1)}% this week
            </span>
          </div>
        )}
      </div>

      {report.report.topWins.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {report.report.topWins[0]}
        </p>
      )}
    </div>
  );
});
