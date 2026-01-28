'use client';

import { AlertTriangle } from 'lucide-react';

interface AttentionListProps {
  items: string[];
}

export function AttentionList({ items }: AttentionListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Areas Needing Attention</h3>
        <p className="mt-4 text-sm text-muted-foreground">
          No concerns at this time
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold">Areas Needing Attention</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <span className="text-sm">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
