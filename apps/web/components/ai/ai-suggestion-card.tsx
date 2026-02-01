"use client";

import { useState } from 'react';
import { Suggestion, getPriorityColor, getSuggestionIcon } from '@/lib/api/ai-suggestions';
import { createAction } from '@/lib/api/ai-actions';

interface AiSuggestionCardProps {
  suggestion: Suggestion;
  onAccept?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export function AiSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  compact = false,
}: AiSuggestionCardProps) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    try {
      setLoading(true);
      await createAction({
        actionType: suggestion.actionType as Parameters<typeof createAction>[0]['actionType'],
        title: suggestion.title,
        description: suggestion.description,
        params: suggestion.actionParams,
        estimatedImpact: suggestion.estimatedImpact,
        requiresApproval: true,
      });
      setAccepted(true);
      onAccept?.();
    } catch (error) {
      console.error('Failed to create action:', error);
    } finally {
      setLoading(false);
    }
  };

  if (accepted) {
    return (
      <div
        className={`rounded-2xl border border-emerald-400/30 bg-emerald-400/10 ${
          compact ? 'p-3' : 'p-4'
        }`}
      >
        <div className="flex items-center gap-2 text-emerald-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Action created! Check pending actions to approve.</span>
        </div>
      </div>
    );
  }

  const priorityColor = getPriorityColor(suggestion.priority);
  const iconPath = getSuggestionIcon(suggestion.icon);

  if (compact) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-white/5 p-3 ${priorityColor} border-l-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
            </svg>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{suggestion.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{suggestion.description}</p>
            </div>
          </div>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="shrink-0 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {loading ? '...' : suggestion.actionLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${priorityColor} border-l-4`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2">
          <svg className="w-6 h-6 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">{suggestion.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{suggestion.description}</p>
              {suggestion.estimatedImpact && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {suggestion.estimatedImpact}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              {suggestion.priority}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="inline-flex items-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                suggestion.actionLabel
              )}
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:border-white/30 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
