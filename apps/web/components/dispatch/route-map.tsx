"use client";

import { Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DispatchTechnician, OptimizedRouteResult, RouteStop } from '@/lib/types/dispatch';
import { formatTime } from './dispatch-utils';

type RoutePreview = OptimizedRouteResult & { generatedAt: string };

interface RouteMapProps {
  technician: DispatchTechnician | null;
  route?: RoutePreview;
  isLoading: boolean;
  onOptimize: () => void;
}

function formatDistance(distance: number) {
  return `${distance.toFixed(1)} km`;
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining} min`;
  return `${hours}h ${remaining}m`;
}

export function RouteMap({ technician, route, isLoading, onOptimize }: RouteMapProps) {
  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center justify-between gap-3 text-base sm:text-lg">
          Route Overview
          <Button size="sm" variant="outline" onClick={onOptimize} disabled={!technician || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Optimize
              </>
            )}
          </Button>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {technician
            ? `Optimized stops for ${technician.name}`
            : 'Select a technician to generate an optimized route.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!technician ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            Pick a technician to view today&apos;s optimized route and ETAs.
          </div>
        ) : !route ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No optimized route yet. Click Optimize to calculate the best path.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-sm font-semibold">{formatDistance(route.totalDistance)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Drive Time</p>
                <p className="text-sm font-semibold">{formatDuration(route.totalDuration)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Savings</p>
                <p className="text-sm font-semibold">{route.savings.percentage}%</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/60 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Stops</span>
                <Badge variant="secondary" className="text-[10px]">
                  {route.stops.length}
                </Badge>
              </div>
              <div className="mt-3 space-y-3">
                {route.stops.map((stop, index) => (
                  <RouteStopRow key={stop.id || index} stop={stop} isLast={index === route.stops.length - 1} />
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RouteStopRow({ stop, isLast }: { stop: RouteStop; isLast: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
        {!isLast && <div className="mt-1 h-full w-px bg-border" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{stop.address || 'Customer stop'}</p>
        <p className="text-xs text-muted-foreground">
          {formatTime(stop.scheduledAt)} · {formatDuration(stop.duration)}
        </p>
      </div>
    </div>
  );
}
