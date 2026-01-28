'use client';

import { useState, useCallback, useEffect } from 'react';
import { WeeklyReport } from '@/lib/types/weekly-report';
import {
  getWeeklyReports,
  getLatestReport,
  generateReport,
} from '@/lib/api/ai-copilot';

export function useWeeklyReports() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [currentReport, setCurrentReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async (limit?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getWeeklyReports(limit);
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLatestReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getLatestReport();
      setCurrentReport(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load latest report'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  useEffect(() => {
    loadReports();
    loadLatestReport();
  }, [loadReports, loadLatestReport]);

  return {
    reports,
    currentReport,
    isLoading,
    isGenerating,
    error,
    loadReports,
    loadLatestReport,
    selectReport,
    triggerGeneration,
    clearError: () => setError(null),
  };
}
