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
      <div className="glass-panel rounded-3xl p-6 animate-pulse">
        <div className="h-3 w-32 rounded-full border border-white/10 bg-white/5" />
        <div className="mt-4 h-7 w-24 rounded-full border border-white/10 bg-white/5" />
        <div className="mt-2 h-4 w-48 rounded-full border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Weekly insights</p>
            <h3 className="mt-2 font-display text-lg text-slate-100">No reports yet</h3>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-400">No reports generated yet.</p>
        <Link
          href="/dashboard/insights"
          className="mt-4 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-white/20"
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
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Weekly insights</p>
            <h3 className="mt-2 font-display text-lg text-slate-100">Revenue pulse</h3>
          </div>
        </div>
        <Link
          href="/dashboard/insights"
          className="flex items-center gap-1 text-xs font-semibold text-emerald-200 hover:text-emerald-100"
        >
          View full report
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4">
        <p className="text-2xl font-semibold text-slate-100">{formatCurrency(keyMetrics.revenue)}</p>
        {keyMetrics.revenueChange !== undefined && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-xs',
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
              {keyMetrics.revenueChange.toFixed(1)}% this week
            </span>
          </div>
        )}
      </div>

      {report.report.topWins.length > 0 && (
        <p className="mt-4 text-sm text-slate-400">{report.report.topWins[0]}</p>
      )}
    </div>
  );
});
