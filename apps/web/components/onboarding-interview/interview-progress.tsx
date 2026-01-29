"use client";

import { Icon } from "@/app/components/Icon";

interface Category {
  category: string;
  label: string;
  completed: number;
  total: number;
}

interface InterviewProgressProps {
  progress: {
    completed: number;
    total: number;
    percent: number;
    currentCategory: string | null;
    categories: Category[];
  } | null;
}

export function InterviewProgress({ progress }: InterviewProgressProps) {
  if (!progress) return null;

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      {/* Overall progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Getting to know your business
          </span>
          <span className="text-sm text-muted-foreground">
            {progress.percent}% complete
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {progress.categories.map((cat) => {
          const isComplete = cat.completed === cat.total;
          const isCurrent = cat.category === progress.currentCategory;
          const isStarted = cat.completed > 0;

          return (
            <div
              key={cat.category}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                transition-colors
                ${
                  isComplete
                    ? 'bg-green-100 text-green-700'
                    : isCurrent
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : isStarted
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-muted text-muted-foreground'
                }
              `}
            >
              {isComplete ? (
                <Icon name="check" size={12} />
              ) : isCurrent ? (
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              ) : null}
              {cat.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
