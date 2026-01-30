"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Suggestion,
  getSuggestions,
  refreshSuggestions,
} from '@/lib/api/ai-suggestions';

interface UseAiSuggestionsResult {
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  expiresAt: string | null;
}

export function useAiSuggestions(
  context: string,
  entityId?: string,
): UseAiSuggestionsResult {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSuggestions(context, entityId);
      setSuggestions(response.suggestions);
      setExpiresAt(response.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [context, entityId]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await refreshSuggestions(context);
      setSuggestions(response.suggestions);
      setExpiresAt(response.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh suggestions');
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return {
    suggestions,
    loading,
    error,
    refresh,
    expiresAt,
  };
}
