'use client';

import { TrendingUp } from 'lucide-react';

interface ForecastSectionProps {
  forecast: string;
}

export function ForecastSection({ forecast }: ForecastSectionProps) {
  if (!forecast) {
    return null;
  }

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-emerald-200" />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Forecast</p>
          <h3 className="mt-2 font-display text-lg text-slate-100">Next-week outlook</h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        {forecast}
      </p>
    </div>
  );
}
