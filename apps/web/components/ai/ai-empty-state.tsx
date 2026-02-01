"use client";

import { useAiSuggestions } from '@/lib/hooks/use-ai-suggestions';
import { AiSuggestionCard } from './ai-suggestion-card';

interface AiEmptyStateProps {
  context: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function AiEmptyState({
  context,
  title,
  description,
  icon,
  actionLabel,
  actionHref,
  onAction,
}: AiEmptyStateProps) {
  const { suggestions, loading, refresh } = useAiSuggestions(context);

  return (
    <div className="text-center py-12 px-6 text-slate-100">
      {icon && (
        <div className="mx-auto w-16 h-16 text-slate-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">{description}</p>

      {actionLabel && (actionHref || onAction) && (
        <div className="mb-8">
          {actionHref ? (
            <a
              href={actionHref}
              className="inline-flex items-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
            >
              {actionLabel}
            </a>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}

      {/* AI Suggestions Section */}
      {loading ? (
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-3">
            <div className="h-20 rounded-2xl border border-white/10 bg-white/5"></div>
            <div className="h-20 rounded-2xl border border-white/10 bg-white/5"></div>
          </div>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Suggestions
            </h4>
            <button
              onClick={refresh}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          <div className="space-y-3 text-left">
            {suggestions.map((suggestion) => (
              <AiSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                compact
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
