'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  Send,
  MousePointer,
  TrendingUp,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getReputationDashboard,
  ReputationDashboard,
} from '@/lib/api/review-requests';
import { cn } from '@/lib/utils';

interface ReviewPipelineProps {
  className?: string;
}

const platformIcons: Record<string, string> = {
  google: 'G',
  yelp: 'Y',
  facebook: 'f',
  unknown: '?',
};

const platformColors: Record<string, string> = {
  google: 'bg-blue-500',
  yelp: 'bg-red-500',
  facebook: 'bg-indigo-600',
  unknown: 'bg-gray-400',
};

function StatCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'CLICKED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
    case 'SENT':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
    case 'SKIPPED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function ReviewPipeline({ className }: ReviewPipelineProps) {
  const [data, setData] = useState<ReputationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboard = await getReputationDashboard();
      setData(dashboard);
    } catch (err) {
      console.error('Failed to load reputation data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Review Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-secondary rounded-lg" />
              ))}
            </div>
            <div className="h-32 bg-secondary rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Review Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Review Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Requests Sent"
            value={data.sentCount}
            icon={<Send className="h-5 w-5" />}
          />
          <StatCard
            label="Reviews Clicked"
            value={data.clickedCount}
            icon={<MousePointer className="h-5 w-5" />}
          />
          <StatCard
            label="Click Rate"
            value={`${data.clickRate}%`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        {/* NPS Gated Stats */}
        {data.npsGatedStats.sent > 0 && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                NPS-Gated Reviews
              </span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              {data.npsGatedStats.clicked} of {data.npsGatedStats.sent} happy
              customers clicked through ({data.npsGatedStats.conversionRate}%
              conversion)
            </p>
          </div>
        )}

        {/* Platform Breakdown */}
        {data.platformBreakdown.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Platform Clicks</h4>
            <div className="flex gap-3">
              {data.platformBreakdown.map((platform) => (
                <div
                  key={platform.platform}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50"
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold',
                      platformColors[platform.platform] || platformColors.unknown
                    )}
                  >
                    {platformIcons[platform.platform] ||
                      platform.platform.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {platform.platform}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {platform.clickCount} clicks
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h4 className="text-sm font-medium mb-3">Recent Review Requests</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {data.recentRequests.slice(0, 8).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      getStatusColor(request.status)
                    )}
                  >
                    {request.status}
                  </span>
                  <span className="text-sm font-medium">
                    {request.customer.name}
                  </span>
                  {request.npsGated && request.npsScore && (
                    <span className="text-xs text-muted-foreground">
                      NPS: {request.npsScore}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {request.platform && (
                    <span className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {request.platform}
                    </span>
                  )}
                  <span>{formatDate(request.sentAt || request.createdAt)}</span>
                </div>
              </div>
            ))}
            {data.recentRequests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No review requests yet
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
