'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        disabled={currentIndex >= reports.length - 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[200px] text-center">
        <span className="text-sm font-medium">
          {formatWeekRange(currentReport.weekStart)}
        </span>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={currentIndex <= 0}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
