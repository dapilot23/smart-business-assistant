"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "../../../components/Icon";
import { useAiSuggestions } from "@/lib/hooks/use-ai-suggestions";
import { AiSuggestionCard } from "@/components/ai/ai-suggestion-card";
import { createCampaign } from "@/lib/api/marketing";

type CampaignType = "SMS_BLAST" | "EMAIL_BLAST" | "DRIP_SEQUENCE" | "REFERRAL" | "SEASONAL";

export default function NewCampaignPage() {
  const router = useRouter();
  const { suggestions, loading: suggestionsLoading, refresh } = useAiSuggestions("marketing_empty");
  const [showManualForm, setShowManualForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "SMS_BLAST" as CampaignType,
    content: "",
    subject: "",
    scheduledAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Campaign name is required");
      return;
    }
    if (!formData.content.trim()) {
      setError("Message content is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createCampaign({
        name: formData.name,
        type: formData.type,
        channel: formData.type.includes("EMAIL") ? "email" : "sms",
        content: formData.content,
        subject: formData.subject || undefined,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
      });

      router.push("/dashboard/marketing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  const campaignSuggestions = suggestions.filter((s) => s.actionType === "CREATE_CAMPAIGN");

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          <Link
            href="/dashboard/marketing"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-emerald-200 hover:border-white/30"
          >
            <Icon name="chevron-right" size={14} className="rotate-180" />
            Back
          </Link>
          <span className="font-primary text-emerald-200/80">&gt; ./business-os --new-campaign</span>
        </div>
        <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">New campaign</h1>
        <p className="text-sm text-slate-400">
          Let AI assemble the messaging or craft your own campaign manually.
        </p>
      </section>

      {!showManualForm && (
        <section className="glass-panel rounded-3xl p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-200">
                <Icon name="sparkles" size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI recommended</p>
                <h2 className="mt-1 font-display text-lg text-slate-100">Campaign starters</h2>
                <p className="text-xs text-slate-400">Based on your business data</p>
              </div>
            </div>
            <button
              onClick={refresh}
              disabled={suggestionsLoading}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:border-white/30"
            >
              <Icon name="refresh-cw" size={14} className={suggestionsLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="mt-4">
            {suggestionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : campaignSuggestions.length > 0 ? (
              <div className="space-y-4">
                {campaignSuggestions.map((suggestion) => (
                  <AiSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAccept={() => {
                      setTimeout(() => router.push("/dashboard/marketing"), 1500);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <Icon name="inbox" size={32} className="text-slate-500 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  No AI suggestions available right now. Try creating a campaign manually.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <button
              onClick={() => setShowManualForm(true)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200"
            >
              <Icon name="edit" size={14} />
              Create a campaign manually
            </button>
          </div>
        </section>
      )}

      {showManualForm && (
        <section className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Manual build</p>
              <h2 className="mt-1 font-display text-lg text-slate-100">Create campaign</h2>
            </div>
            <button
              onClick={() => setShowManualForm(false)}
              className="text-xs uppercase tracking-[0.2em] text-emerald-200"
            >
              Back to AI
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
                Campaign name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Sale 2026"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Campaign type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CampaignType })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none"
              >
                <option value="SMS_BLAST">SMS Blast</option>
                <option value="EMAIL_BLAST">Email Blast</option>
                <option value="DRIP_SEQUENCE">Drip Sequence</option>
                <option value="REFERRAL">Referral Program</option>
                <option value="SEASONAL">Seasonal Promotion</option>
              </select>
            </div>

            {formData.type === "EMAIL_BLAST" && (
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-200 mb-2">
                  Email subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Do not miss our summer sale"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-slate-200 mb-2">
                Message content
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
                placeholder="Write your message here..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
              />
              {formData.type === "SMS_BLAST" && (
                <p className="mt-1 text-xs text-slate-500">
                  {formData.content.length}/160 characters
                </p>
              )}
            </div>

            <div>
              <label htmlFor="scheduledAt" className="block text-sm font-medium text-slate-200 mb-2">
                Schedule (optional)
              </label>
              <input
                type="datetime-local"
                id="scheduledAt"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <Link
                href="/dashboard/marketing"
                className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
              >
                {loading && <Icon name="loader-2" size={16} className="animate-spin" />}
                {loading ? "Creating..." : "Create campaign"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
