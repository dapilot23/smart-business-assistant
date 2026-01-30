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

  // Filter suggestions to only show campaign-related ones
  const campaignSuggestions = suggestions.filter(s => s.actionType === "CREATE_CAMPAIGN");

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:h-20 border-b border-border">
        <Link
          href="/dashboard/marketing"
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Icon name="chevron-right" size={20} className="text-muted-foreground rotate-180" />
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">New Campaign</h1>
          <p className="text-sm text-muted-foreground">Let AI help you create the perfect campaign</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {/* AI Suggestions Section */}
          {!showManualForm && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon name="sparkles" size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">AI-Recommended Campaigns</h2>
                    <p className="text-sm text-muted-foreground">Based on your business data</p>
                  </div>
                </div>
                <button
                  onClick={refresh}
                  disabled={suggestionsLoading}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Icon name="refresh-cw" size={14} className={suggestionsLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              {suggestionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : campaignSuggestions.length > 0 ? (
                <div className="space-y-4">
                  {campaignSuggestions.map((suggestion) => (
                    <AiSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onAccept={() => {
                        // Redirect to marketing page after action is created
                        setTimeout(() => router.push("/dashboard/marketing"), 1500);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                  <Icon name="inbox" size={32} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No AI suggestions available right now. Try creating a campaign manually.
                  </p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border">
                <button
                  onClick={() => setShowManualForm(true)}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Icon name="edit" size={14} />
                  Or create a campaign manually
                </button>
              </div>
            </div>
          )}

          {/* Manual Form */}
          {showManualForm && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-foreground">Create Campaign Manually</h2>
                <button
                  onClick={() => setShowManualForm(false)}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Icon name="sparkles" size={14} />
                  Back to AI suggestions
                </button>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campaign Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer Sale 2026"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Campaign Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Campaign Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as CampaignType })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="SMS_BLAST">SMS Blast</option>
                    <option value="EMAIL_BLAST">Email Blast</option>
                    <option value="DRIP_SEQUENCE">Drip Sequence</option>
                    <option value="REFERRAL">Referral Program</option>
                    <option value="SEASONAL">Seasonal Promotion</option>
                  </select>
                </div>

                {/* Email Subject */}
                {formData.type === "EMAIL_BLAST" && (
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Don't miss our summer sale!"
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Message Content */}
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-foreground mb-2">
                    Message Content
                  </label>
                  <textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={5}
                    placeholder="Write your message here..."
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  {formData.type === "SMS_BLAST" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formData.content.length}/160 characters
                    </p>
                  )}
                </div>

                {/* Schedule */}
                <div>
                  <label htmlFor="scheduledAt" className="block text-sm font-medium text-foreground mb-2">
                    Schedule (optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduledAt"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Link
                    href="/dashboard/marketing"
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                  >
                    {loading && <Icon name="loader-2" size={16} className="animate-spin" />}
                    {loading ? "Creating..." : "Create Campaign"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
