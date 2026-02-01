'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeeklyReport } from '@/lib/types/weekly-report';

interface WeekSelectorProps {
  reports: WeeklyReport[];
  currentReport: WeeklyReport | null;
  onSelect: (id: string) => void;
}

export function WeekSelector({
  reports,
  currentReport,
  onSelect,
}: WeekSelectorProps) {
  const currentIndex = currentReport
    ? reports.findIndex((r) => r.id === currentReport.id)
    : 0;

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };

    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}, ${start.getFullYear()}`;
  };

  const handlePrevious = () => {
    if (currentIndex < reports.length - 1) {
      onSelect(reports[currentIndex + 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex > 0) {
      onSelect(reports[currentIndex - 1].id);
    }
  };

  if (!currentReport) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2">
      <button
        onClick={handlePrevious}
        disabled={currentIndex >= reports.length - 1}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="min-w-[220px] text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Week of</p>
        <span className="text-sm font-semibold text-slate-100">
          {formatWeekRange(currentReport.weekStart)}
        </span>
      </div>
      <button
        onClick={handleNext}
        disabled={currentIndex <= 0}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
