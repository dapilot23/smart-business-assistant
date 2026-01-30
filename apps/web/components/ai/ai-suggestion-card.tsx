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
      <div className={`border-l-4 border-l-green-500 bg-green-50 rounded-lg p-4 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-2 text-green-700">
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
      <div className={`border-l-4 ${priorityColor} rounded-lg p-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <svg className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
            </svg>
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">{suggestion.title}</h4>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{suggestion.description}</p>
            </div>
          </div>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '...' : suggestion.actionLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-l-4 ${priorityColor} rounded-lg p-4 transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 p-2 bg-white rounded-lg shadow-sm">
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{suggestion.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
              {suggestion.estimatedImpact && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {suggestion.estimatedImpact}
                </p>
              )}
            </div>
            <span className={`shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
              suggestion.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
              suggestion.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {suggestion.priority}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
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
