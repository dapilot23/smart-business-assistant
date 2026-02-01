'use client';

import { RefreshCw, BarChart3 } from 'lucide-react';
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

  const handleGenerateReport = async () => {
    try {
      await triggerGeneration();
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  const header = (
    <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Insights</h1>
        <p className="text-sm text-slate-400">Weekly summary of your business.</p>
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
  );
}
