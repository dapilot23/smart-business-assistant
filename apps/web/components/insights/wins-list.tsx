'use client';

import { CheckCircle } from 'lucide-react';

interface WinsListProps {
  wins: string[];
}

export function WinsList({ wins }: WinsListProps) {
  if (wins.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Top Wins This Week</h3>
        <p className="mt-4 text-sm text-muted-foreground">No wins recorded yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold">Top Wins This Week</h3>
      <ul className="mt-4 space-y-3">
        {wins.map((win, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            <span className="text-sm">{win}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
