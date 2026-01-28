'use client';

import { Circle, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { simpleHash } from '@/lib/utils';

interface ActionItemsProps {
  items: string[];
  reportId?: string;
}

const STORAGE_KEY_PREFIX = 'action-items-completed-';
const MAX_STORED_REPORTS = 50; // Limit localStorage entries to prevent quota issues

/**
 * Cleans up old localStorage entries to prevent quota exceeded errors.
 * Keeps only the most recent MAX_STORED_REPORTS entries.
 */
function cleanupOldEntries(): void {
  try {
    const entries: { key: string; timestamp: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        // Try to get timestamp from stored data, or use 0 if not available
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            entries.push({
              key,
              timestamp: parsed.timestamp || 0,
            });
          }
        } catch {
          // If we can't parse it, mark for cleanup
          entries.push({ key, timestamp: 0 });
        }
      }
    }

    // If we have too many entries, remove the oldest ones
    if (entries.length > MAX_STORED_REPORTS) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, entries.length - MAX_STORED_REPORTS);
      for (const entry of toRemove) {
        localStorage.removeItem(entry.key);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

interface StoredData {
  completedHashes: string[];
  timestamp: number;
}

export function ActionItems({ items, reportId }: ActionItemsProps) {
  // Create a map of item content hash -> item for stable identification
  const itemHashes = useMemo(() => {
    return items.map((item) => simpleHash(item));
  }, [items]);

  const [completedHashes, setCompletedHashes] = useState<Set<string>>(new Set());

  // Load from localStorage on mount or when reportId changes
  useEffect(() => {
    if (!reportId) return;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${reportId}`);
      if (stored) {
        const parsed: StoredData = JSON.parse(stored);
        if (Array.isArray(parsed.completedHashes)) {
          setCompletedHashes(new Set(parsed.completedHashes));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [reportId]);

  // Persist to localStorage when completed changes
  const persistCompleted = useCallback((newCompletedHashes: Set<string>) => {
    if (!reportId) return;
    try {
      // Run cleanup periodically (1 in 10 saves)
      if (Math.random() < 0.1) {
        cleanupOldEntries();
      }

      const data: StoredData = {
        completedHashes: Array.from(newCompletedHashes),
        timestamp: Date.now(),
      };
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${reportId}`,
        JSON.stringify(data)
      );
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
      // Try cleanup and retry once
      try {
        cleanupOldEntries();
        const data: StoredData = {
          completedHashes: Array.from(newCompletedHashes),
          timestamp: Date.now(),
        };
        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${reportId}`,
          JSON.stringify(data)
        );
      } catch {
        // Give up silently
      }
    }
  }, [reportId]);

  const toggleItem = useCallback((itemHash: string) => {
    setCompletedHashes((prev) => {
      const next = new Set(prev);
      if (next.has(itemHash)) {
        next.delete(itemHash);
      } else {
        next.add(itemHash);
      }
      persistCompleted(next);
      return next;
    });
  }, [persistCompleted]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Action Items</h3>
        <p className="mt-4 text-sm text-muted-foreground">No action items</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold">Action Items</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => {
          const itemHash = itemHashes[index];
          const isCompleted = completedHashes.has(itemHash);

          return (
            <li key={itemHash} className="flex items-start gap-3">
              <button
                onClick={() => toggleItem(itemHash)}
                className="mt-0.5 shrink-0 text-primary hover:opacity-80"
                aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
              <span
                className={`text-sm ${isCompleted ? 'text-muted-foreground line-through' : ''}`}
              >
                {item}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
