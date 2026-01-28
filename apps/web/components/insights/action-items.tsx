'use client';

import { Circle, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface ActionItemsProps {
  items: string[];
  reportId?: string;
}

const STORAGE_KEY_PREFIX = 'action-items-completed-';
const MAX_STORED_REPORTS = 50;

interface StoredData {
  completedItems: string[];  // Store actual content, not hashes (no collision risk)
  timestamp: number;
  version: number;  // For future schema migrations
}

const CURRENT_VERSION = 2;

/**
 * Validates stored data structure at runtime.
 * Returns null if invalid, forcing a fresh start.
 */
function validateStoredData(data: unknown): StoredData | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  // Handle version 1 (old format with completedHashes)
  if (Array.isArray(obj.completedHashes) && !obj.version) {
    return {
      completedItems: obj.completedHashes as string[],
      timestamp: typeof obj.timestamp === 'number' ? obj.timestamp : Date.now(),
      version: CURRENT_VERSION,
    };
  }

  // Validate current version
  if (!Array.isArray(obj.completedItems)) return null;
  if (typeof obj.timestamp !== 'number') return null;

  return {
    completedItems: obj.completedItems.filter((item): item is string => typeof item === 'string'),
    timestamp: obj.timestamp,
    version: typeof obj.version === 'number' ? obj.version : CURRENT_VERSION,
  };
}

/**
 * Counts action-items entries in localStorage.
 */
function countStoredEntries(): number {
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        count++;
      }
    }
  } catch {
    // Ignore errors
  }
  return count;
}

/**
 * Cleans up old localStorage entries deterministically.
 * Called when entry count exceeds MAX_STORED_REPORTS.
 */
function cleanupOldEntries(): void {
  try {
    const entries: { key: string; timestamp: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            entries.push({
              key,
              timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : 0,
            });
          }
        } catch {
          // If we can't parse it, mark for cleanup with timestamp 0
          entries.push({ key, timestamp: 0 });
        }
      }
    }

    // Remove oldest entries to get back under limit
    if (entries.length > MAX_STORED_REPORTS) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, entries.length - MAX_STORED_REPORTS + 10); // Remove extra 10 for headroom
      for (const entry of toRemove) {
        localStorage.removeItem(entry.key);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

export function ActionItems({ items, reportId }: ActionItemsProps) {
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  // Load from localStorage on mount or when reportId changes
  useEffect(() => {
    if (!reportId) return;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${reportId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = validateStoredData(parsed);
        if (validated) {
          setCompletedItems(new Set(validated.completedItems));
        }
      }
    } catch {
      // Ignore localStorage errors - start fresh
    }
  }, [reportId]);

  // Persist to localStorage
  const persistCompleted = useCallback((newCompletedItems: Set<string>) => {
    if (!reportId) return;

    // Deterministic cleanup: check count before save
    const entryCount = countStoredEntries();
    if (entryCount >= MAX_STORED_REPORTS) {
      cleanupOldEntries();
    }

    const data: StoredData = {
      completedItems: Array.from(newCompletedItems),
      timestamp: Date.now(),
      version: CURRENT_VERSION,
    };

    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${reportId}`,
        JSON.stringify(data)
      );
    } catch {
      // Quota exceeded - force cleanup and retry
      try {
        cleanupOldEntries();
        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${reportId}`,
          JSON.stringify(data)
        );
      } catch {
        // Give up silently
      }
    }
  }, [reportId]);

  const toggleItem = useCallback((itemContent: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemContent)) {
        next.delete(itemContent);
      } else {
        next.add(itemContent);
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
          const isCompleted = completedItems.has(item);

          return (
            // Using index as key since items don't reorder within a report
            <li key={index} className="flex items-start gap-3">
              <button
                onClick={() => toggleItem(item)}
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
