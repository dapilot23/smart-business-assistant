'use client';

import { CheckCircle } from 'lucide-react';

interface WinsListProps {
  wins: string[];
}

export function WinsList({ wins }: WinsListProps) {
  if (wins.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Top wins</p>
        <h3 className="mt-2 font-display text-lg text-slate-100">Momentum this week</h3>
        <p className="mt-4 text-sm text-slate-400">No wins recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Top wins</p>
      <h3 className="mt-2 font-display text-lg text-slate-100">Momentum this week</h3>
      <ul className="mt-4 space-y-3">
        {wins.map((win, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span className="text-sm text-slate-200">{win}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
