'use client';

import { Circle, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface ActionItemsProps {
  items: string[];
  reportId?: string;
}

const STORAGE_KEY_PREFIX = 'action-items-completed-';

export function ActionItems({ items, reportId }: ActionItemsProps) {
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // Load from localStorage on mount or when reportId changes
  useEffect(() => {
    if (!reportId) return;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${reportId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCompleted(new Set(parsed));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [reportId]);

  // Persist to localStorage when completed changes
  const persistCompleted = useCallback((newCompleted: Set<number>) => {
    if (!reportId) return;
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${reportId}`,
        JSON.stringify(Array.from(newCompleted))
      );
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }, [reportId]);

  const toggleItem = (index: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      persistCompleted(next);
      return next;
    });
  };

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
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <button
              onClick={() => toggleItem(index)}
              className="mt-0.5 shrink-0 text-primary hover:opacity-80"
            >
              {completed.has(index) ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <span
              className={`text-sm ${completed.has(index) ? 'text-muted-foreground line-through' : ''}`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
