"use client";

import { useState, useEffect } from "react";
import { Icon } from "../../components/Icon";
import {
  getCampaigns,
  getReferralStats,
  getSegments,
  Campaign,
  ReferralStats,
  AudienceSegment,
} from "@/lib/api/marketing";

interface MarketingStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgConversionRate: number;
}

function calculateStats(campaigns: Campaign[]): MarketingStats {
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.openCount, 0);
  const totalConverted = campaigns.reduce((sum, c) => sum + c.conversionCount, 0);

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE' || c.status === 'SCHEDULED').length,
    totalSent,
    avgOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    avgConversionRate: totalSent > 0 ? (totalConverted / totalSent) * 100 : 0,
  };
}

function StatCard({ icon, label, value, subValue }: {
  icon: "megaphone" | "send" | "target" | "gift";
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name={icon} size={20} className="text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
          {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: Campaign['status'] }) {
  const styles = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    ACTIVE: 'bg-green-100 text-green-700',
    PAUSED: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-purple-100 text-purple-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [campaignsData, segmentsData, referralData] = await Promise.all([
        getCampaigns().catch(() => []),
        getSegments().catch(() => []),
        getReferralStats().catch(() => null),
      ]);
      setCampaigns(campaignsData);
      setSegments(segmentsData);
      setReferralStats(referralData);
    } catch (err) {
      setError('Failed to load marketing data');
      console.error('Failed to load marketing data:', err);
    } finally {
      setLoading(false);
    }
  }

  const stats = calculateStats(campaigns);

  if (loading) {
    return (
      <main className="flex flex-col h-full w-full">
        <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 lg:h-20 border-b border-border">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Marketing</h1>
        </header>
        <div className="flex items-center justify-center flex-1">
          <Icon name="loader-2" size={32} className="text-primary animate-spin" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:h-20 border-b border-border">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Marketing</h1>
          <p className="text-sm text-muted-foreground">Manage campaigns, segments, and referral programs</p>
        </div>
        <button className="flex items-center gap-2 h-10 px-4 bg-primary rounded-lg hover:opacity-90 transition-opacity">
          <Icon name="plus" size={18} className="text-primary-foreground" />
          <span className="text-sm font-medium text-primary-foreground">New Campaign</span>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon="megaphone"
            label="Total Campaigns"
            value={stats.totalCampaigns}
            subValue={`${stats.activeCampaigns} active`}
          />
          <StatCard
            icon="send"
            label="Messages Sent"
            value={stats.totalSent.toLocaleString()}
          />
          <StatCard
            icon="target"
            label="Avg Open Rate"
            value={`${stats.avgOpenRate.toFixed(1)}%`}
          />
          <StatCard
            icon="gift"
            label="Referrals"
            value={referralStats?.totalReferrals ?? 0}
            subValue={referralStats ? `${referralStats.convertedReferrals} converted` : undefined}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaigns Section */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Recent Campaigns</h2>
              <button className="text-sm text-primary hover:underline">View All</button>
            </div>
            <div className="divide-y divide-border">
              {campaigns.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                    <Icon name="megaphone" size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">No campaigns yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first marketing campaign to reach your customers
                  </p>
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                    <Icon name="plus" size={16} />
                    Create Campaign
                  </button>
                </div>
              ) : (
                campaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="px-6 py-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium text-foreground truncate">
                            {campaign.name}
                          </h3>
                          <CampaignStatusBadge status={campaign.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {campaign.type.replace('_', ' ')} &bull; Sent: {campaign.sentCount} &bull; Conv: {campaign.conversionCount}
                        </p>
                      </div>
                      <button className="p-2 hover:bg-muted rounded-lg">
                        <Icon name="chevron-right" size={16} className="text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Segments Card */}
            <div className="bg-card border border-border rounded-xl">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Audience Segments</h2>
                <button className="text-sm text-primary hover:underline">Manage</button>
              </div>
              <div className="p-4 space-y-3">
                {segments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No segments created</p>
                    <button className="text-sm text-primary hover:underline">Create segment</button>
                  </div>
                ) : (
                  segments.slice(0, 4).map((segment) => (
                    <div key={segment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">{segment.name}</p>
                        <p className="text-xs text-muted-foreground">{segment.memberCount} members</p>
                      </div>
                      <Icon name="chevron-right" size={16} className="text-muted-foreground" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Referral Program Card */}
            <div className="bg-card border border-border rounded-xl">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Referral Program</h2>
                <button className="text-sm text-primary hover:underline">Settings</button>
              </div>
              <div className="p-4">
                {referralStats ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Referrals</span>
                      <span className="text-sm font-medium text-foreground">{referralStats.totalReferrals}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pending</span>
                      <span className="text-sm font-medium text-foreground">{referralStats.pendingReferrals}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Converted</span>
                      <span className="text-sm font-medium text-green-600">{referralStats.convertedReferrals}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Rewards Issued</span>
                      <span className="text-sm font-medium text-foreground">{referralStats.rewardedReferrals}</span>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Conversion Rate</span>
                        <span className="text-sm font-semibold text-primary">
                          {referralStats.totalReferrals > 0
                            ? ((referralStats.convertedReferrals / referralStats.totalReferrals) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">Referral program not configured</p>
                    <button className="text-sm text-primary hover:underline">Set up program</button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Icon name="send" size={16} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-foreground">Send SMS Blast</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Icon name="users" size={16} className="text-purple-600" />
                  </div>
                  <span className="text-sm text-foreground">Create Segment</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Icon name="gift" size={16} className="text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Generate Referral Code</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
