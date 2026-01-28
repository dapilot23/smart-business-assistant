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

  if (isLoading && reports.length === 0) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-destructive">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!currentReport) {
    return (
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Business Insights</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered weekly analysis of your business performance
          </p>
        </div>

        <div className="flex flex-col items-center justify-center h-64 gap-4 rounded-xl border border-border bg-card">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No reports generated yet</p>
          <Button onClick={handleGenerateReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Your First Report'
            )}
          </Button>
        </div>
      </div>
    );
  }

  const { keyMetrics, topWins, areasNeedingAttention, actionItems, forecast } =
    currentReport.report;

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Insights</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered weekly analysis of your business performance
          </p>
        </div>
        <Button onClick={handleGenerateReport} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Report
            </>
          )}
        </Button>
      </div>

      <div className="mb-6 flex justify-center">
        <WeekSelector
          reports={reports}
          currentReport={currentReport}
          onSelect={selectReport}
        />
      </div>

      <MetricsGrid metrics={keyMetrics} />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <WinsList wins={topWins} />
        <AttentionList items={areasNeedingAttention} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <ActionItems items={actionItems} reportId={currentReport.id} />
        <ForecastSection forecast={forecast} />
      </div>
    </div>
  );
}
