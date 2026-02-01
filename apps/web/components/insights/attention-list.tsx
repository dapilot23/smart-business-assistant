'use client';

import { AlertTriangle } from 'lucide-react';

interface AttentionListProps {
  items: string[];
}

export function AttentionList({ items }: AttentionListProps) {
  if (items.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attention</p>
        <h3 className="mt-2 font-display text-lg text-slate-100">Areas to monitor</h3>
        <p className="mt-4 text-sm text-slate-400">No concerns at this time.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attention</p>
      <h3 className="mt-2 font-display text-lg text-slate-100">Areas to monitor</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span className="text-sm text-slate-200">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
