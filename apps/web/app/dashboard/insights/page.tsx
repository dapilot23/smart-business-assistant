'use client';

import { RefreshCw, BarChart3 } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useWeeklyReports } from '@/lib/hooks/use-weekly-reports';
import {
  MetricsGrid,
  WinsList,
  AttentionList,
  ActionItems,
  ForecastSection,
  WeekSelector,
  ReviewPipeline,
} from '@/components/insights';

function formatRecentRange(days = 7) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const format = (value: Date) =>
    value.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

  return `${format(start)} - ${format(end)}`;
}

function formatWeekRange(weekStart?: string) {
  if (!weekStart) return formatRecentRange();
  const start = new Date(weekStart);
  if (Number.isNaN(start.getTime())) return formatRecentRange();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const format = (value: Date) =>
    value.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

  return `${format(start)} - ${format(end)}`;
}

export default function InsightsPage() {
  const {
    reports,
    currentReport,
    isLoading,
    isGenerating,
    error,
    selectReport,
    triggerGeneration,
  } = useWeeklyReports();

  const handleGenerateReport = useCallback(async () => {
    try {
      await triggerGeneration();
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  }, [triggerGeneration]);

  useEffect(() => {
    const handler = () => {
      handleGenerateReport();
    };
    window.addEventListener('insights:generate-report', handler as EventListener);
    return () => window.removeEventListener('insights:generate-report', handler as EventListener);
  }, [handleGenerateReport]);

  const rangeLabel = formatWeekRange(currentReport?.weekStart);
  const statusText = isLoading ? 'Loading...' : currentReport ? 'Report ready' : 'No report yet';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const keySignals = currentReport
    ? [
        {
          label: 'Revenue',
          value: formatCurrency(currentReport.report.keyMetrics.revenue),
          note:
            typeof currentReport.report.keyMetrics.revenueChange === 'number'
              ? `${currentReport.report.keyMetrics.revenueChange.toFixed(1)}% vs last week`
              : 'No trend yet',
        },
        {
          label: 'Jobs completed',
          value: currentReport.report.keyMetrics.jobsCompleted.toString(),
          note: 'This week',
        },
        {
          label: 'NPS score',
          value: currentReport.report.keyMetrics.npsScore.toString(),
          note: 'Customer sentiment',
        },
      ]
    : [];

  const statusBar = (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
      <span className="text-slate-200">Status:</span>
      <span>{statusText}</span>
      <span className="text-slate-600">|</span>
      <span className="text-slate-200">Range:</span>
      <span>{rangeLabel}</span>
    </div>
  );

  const header = (
    <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Insights</h1>
        <p className="text-sm text-slate-400">A simple weekly snapshot.</p>
      </div>
      {currentReport && (
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="rounded-full bg-emerald-400 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              New report
            </>
          )}
        </Button>
      )}
    </section>
  );

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        {statusBar}
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-sm text-slate-400">Loading insights...</div>
        </div>
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        {statusBar}
        <div className="glass-panel rounded-3xl p-6 text-center">
          <p className="text-sm text-rose-200">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-100 hover:border-rose-300/60"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentReport) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        {statusBar}
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="rounded-full border border-white/10 bg-white/5 p-3">
              <BarChart3 className="h-6 w-6 text-emerald-200" />
            </div>
            <p className="text-sm text-slate-400">No reports yet.</p>
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
            >
              {isGenerating ? 'Generating...' : 'Generate report'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { keyMetrics, topWins, areasNeedingAttention, actionItems, forecast } =
    currentReport.report;

  return (
    <div className="flex flex-col gap-8">
      {header}
      {statusBar}

      <div className="glass-panel rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Key signals</p>
            <h2 className="mt-2 font-display text-lg text-slate-100">At a glance</h2>
          </div>
          <a
            href="#full-report"
            className="text-xs font-semibold text-emerald-200 hover:text-emerald-100"
          >
            View full report
          </a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {keySignals.map((signal) => (
            <div
              key={signal.label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {signal.label}
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-100">{signal.value}</p>
              <p className="text-xs text-slate-400">{signal.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div id="full-report" className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Full report</p>
          <h2 className="font-display text-lg text-slate-100">Weekly details</h2>
        </div>

        <div className="flex justify-center">
          <WeekSelector
            reports={reports}
            currentReport={currentReport}
            onSelect={selectReport}
          />
        </div>

        <MetricsGrid metrics={keyMetrics} />

        <div className="grid gap-6 md:grid-cols-2">
          <WinsList wins={topWins} />
          <AttentionList items={areasNeedingAttention} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ActionItems items={actionItems} reportId={currentReport.id} />
          <ForecastSection forecast={forecast} />
        </div>

        <ReviewPipeline />
      </div>
    </div>
  );
}
