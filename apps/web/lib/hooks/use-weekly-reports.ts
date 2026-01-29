'use client';

import { useState, useCallback, useEffect } from 'react';
import { WeeklyReport } from '@/lib/types/weekly-report';
import { getWeeklyReports, generateReport } from '@/lib/api/ai-copilot';

export function useWeeklyReports() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [currentReport, setCurrentReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true for initial load
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single API call to load reports - latest is derived from the list
  const loadReports = useCallback(async (limit?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getWeeklyReports(limit);
      setReports(data);
      // Set current report to the latest (first in list)
      if (data.length > 0 && !currentReport) {
        setCurrentReport(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, [currentReport]);

  const selectReport = useCallback(
    (id: string) => {
      const report = reports.find((r) => r.id === id);
      if (report) {
        setCurrentReport(report);
      }
    },
    [reports]
  );

  const triggerGeneration = useCallback(async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const newReport = await generateReport();
      setCurrentReport(newReport);
      setReports((prev) => [newReport, ...prev]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate report'
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Single fetch on mount - no waterfall
  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    reports,
    currentReport,
    isLoading,
    isGenerating,
    error,
    loadReports,
    selectReport,
    triggerGeneration,
    clearError: () => setError(null),
  };
}
