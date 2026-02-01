"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "../../components/Icon";
import { AiEmptyState } from "@/components/ai/ai-empty-state";
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
    activeCampaigns: campaigns.filter(
      (c) => c.status === "ACTIVE" || c.status === "SCHEDULED",
    ).length,
    totalSent,
    avgOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    avgConversionRate: totalSent > 0 ? (totalConverted / totalSent) * 100 : 0,
  };
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  tone,
}: {
  icon: "megaphone" | "send" | "target" | "gift";
  label: string;
  value: string | number;
  subValue?: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${tone}`}>
          <Icon name={icon} size={18} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-semibold text-slate-100">{value}</p>
          {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: Campaign["status"] }) {
  const styles = {
    DRAFT: "border-white/10 bg-white/5 text-slate-400",
    SCHEDULED: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    ACTIVE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    PAUSED: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    COMPLETED: "border-violet-300/30 bg-violet-300/10 text-violet-200",
    CANCELLED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${styles[status]}`}
    >
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
      setError("Failed to load marketing data");
      console.error("Failed to load marketing data:", err);
    } finally {
      setLoading(false);
    }
  }

  const stats = calculateStats(campaigns);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Icon name="loader-2" size={32} className="text-emerald-200 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">
            Growth layer
          </span>
          <span className="font-primary text-emerald-200/80">&gt; ./business-os --marketing</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Marketing control</h1>
            <p className="text-sm text-slate-400">
              Manage campaigns, segments, and referral programs with AI support.
            </p>
          </div>
          <Link
            href="/dashboard/marketing/new"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
          >
            <Icon name="plus" size={16} />
            New campaign
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Performance</p>
          <h2 className="font-display text-lg text-slate-100">Campaign signals</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="megaphone"
            label="Total campaigns"
            value={stats.totalCampaigns}
            subValue={`${stats.activeCampaigns} active`}
            tone="text-emerald-200"
          />
          <StatCard
            icon="send"
            label="Messages sent"
            value={stats.totalSent.toLocaleString()}
            tone="text-sky-200"
          />
          <StatCard
            icon="target"
            label="Avg open rate"
            value={`${stats.avgOpenRate.toFixed(1)}%`}
            tone="text-amber-200"
          />
          <StatCard
            icon="gift"
            label="Referrals"
            value={referralStats?.totalReferrals ?? 0}
            subValue={referralStats ? `${referralStats.convertedReferrals} converted` : undefined}
            tone="text-rose-200"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent campaigns</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">Outbound launches</h2>
            </div>
            <button className="text-xs uppercase tracking-[0.2em] text-emerald-200 hover:text-emerald-100">
              View all
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {campaigns.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5">
                <AiEmptyState
                  context="marketing_empty"
                  title="No campaigns yet"
                  description="Create your first marketing campaign and let the AI generate ideas and copy based on your business data."
                  icon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  }
                />
              </div>
            ) : (
              campaigns.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-100">{campaign.name}</h3>
                        <CampaignStatusBadge status={campaign.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {campaign.type.replace("_", " ")} - Sent: {campaign.sentCount} - Conv: {campaign.conversionCount}
                      </p>
                    </div>
                    <button className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-slate-200">
                      <Icon name="chevron-right" size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Segments</p>
                <h2 className="mt-2 font-display text-lg text-slate-100">Audience groups</h2>
              </div>
              <button className="text-xs uppercase tracking-[0.2em] text-emerald-200 hover:text-emerald-100">
                Manage
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {segments.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-slate-400">No segments created</p>
                  <button className="mt-2 text-xs uppercase tracking-[0.2em] text-emerald-200">
                    Create segment
                  </button>
                </div>
              ) : (
                segments.slice(0, 4).map((segment) => (
                  <div
                    key={segment.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{segment.name}</p>
                      <p className="text-xs text-slate-400">{segment.memberCount} members</p>
                    </div>
                    <Icon name="chevron-right" size={16} className="text-slate-400" />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Referrals</p>
                <h2 className="mt-2 font-display text-lg text-slate-100">Referral program</h2>
              </div>
              <button className="text-xs uppercase tracking-[0.2em] text-emerald-200 hover:text-emerald-100">
                Settings
              </button>
            </div>
            <div className="mt-4">
              {referralStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Total referrals</span>
                    <span className="text-slate-100">{referralStats.totalReferrals}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Pending</span>
                    <span className="text-slate-100">{referralStats.pendingReferrals}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Converted</span>
                    <span className="text-emerald-200">{referralStats.convertedReferrals}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Rewards issued</span>
                    <span className="text-slate-100">{referralStats.rewardedReferrals}</span>
                  </div>
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>Conversion rate</span>
                      <span className="text-emerald-200">
                        {referralStats.totalReferrals > 0
                          ? ((referralStats.convertedReferrals / referralStats.totalReferrals) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-slate-400">Referral program not configured</p>
                  <button className="mt-2 text-xs uppercase tracking-[0.2em] text-emerald-200">
                    Set up program
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quick actions</p>
            <h3 className="mt-2 font-display text-lg text-slate-100">Launch tools</h3>
            <div className="mt-4 space-y-2">
              <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-slate-100 hover:border-white/30">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sky-200">
                    <Icon name="send" size={16} />
                  </span>
                  Send SMS blast
                </div>
              </button>
              <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-slate-100 hover:border-white/30">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-violet-200">
                    <Icon name="users" size={16} />
                  </span>
                  Create segment
                </div>
              </button>
              <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-slate-100 hover:border-white/30">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-200">
                    <Icon name="gift" size={16} />
                  </span>
                  Generate referral code
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
