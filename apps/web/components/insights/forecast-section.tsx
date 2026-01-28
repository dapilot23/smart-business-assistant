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
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Forecast</h3>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {forecast}
      </p>
    </div>
  );
}
