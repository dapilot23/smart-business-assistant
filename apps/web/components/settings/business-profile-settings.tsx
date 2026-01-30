"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/app/components/Icon";
import {
  getOnboardingStatus,
  getInterviewSummary,
  updateProfileField,
  type OnboardingStatus,
  type InterviewSummary,
  type ProfileField,
} from "@/lib/api/onboarding-interview";

export function BusinessProfileSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);

  useEffect(() => {
    loadBusinessProfile();
  }, []);

  async function loadBusinessProfile() {
    try {
      setLoading(true);
      const statusData = await getOnboardingStatus();
      setStatus(statusData);

      if (statusData.status === "COMPLETED") {
        const summaryData = await getInterviewSummary();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error("Failed to load business profile:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleStartInterview() {
    router.push("/onboarding");
  }

  async function handleUpdateField(field: ProfileField, value: unknown) {
    if (!summary) return;
    await updateProfileField(field, value);
    setSummary({
      ...summary,
      profile: {
        ...summary.profile,
        [field]: value,
      },
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="loader-2" size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  // Not completed - show prompt to start interview
  if (!status || status.status !== "COMPLETED") {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon name="bot" size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                Complete Your Business Profile
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                {status?.status === "IN_PROGRESS"
                  ? `You&apos;re ${status.percentComplete}% through the interview. Continue to unlock AI-powered personalization.`
                  : "Take 5 minutes to answer a few questions about your business. This helps our AI personalize everything for you."}
              </p>
              <Button onClick={handleStartInterview} className="bg-blue-600 hover:bg-blue-700">
                <Icon name="message-square" size={16} />
                {status?.status === "IN_PROGRESS" ? "Continue Interview" : "Start Interview"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Completed - show profile
  return (
    <div className="space-y-6">
      {/* AI Summary */}
      {summary?.aiSummary && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="bot" size={16} className="text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">AI Business Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {summary.aiSummary}
          </p>
        </div>
      )}

      {/* Brand Voice */}
      {summary?.brandVoice && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="message-square" size={18} className="text-blue-600" />
            <h3 className="font-semibold text-blue-900">Communication Style</h3>
          </div>
          <p className="text-sm text-blue-800 leading-relaxed">
            {summary.brandVoice}
          </p>
        </div>
      )}

      {/* Profile Details */}
      {summary?.profile && Object.keys(summary.profile).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="building-2" size={18} className="text-primary" />
            Business Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <EditableProfileField
              label="Industry"
              field="industry"
              value={summary.profile.industry}
              onSave={handleUpdateField}
            />
            <EditableProfileField
              label="Target Market"
              field="targetMarket"
              value={summary.profile.targetMarket}
              onSave={handleUpdateField}
            />
            <EditableProfileField
              label="Service Area"
              field="serviceArea"
              value={summary.profile.serviceArea}
              onSave={handleUpdateField}
            />
            <EditableProfileField
              label="Team Size"
              field="teamSize"
              value={summary.profile.teamSize}
              onSave={handleUpdateField}
              type="number"
            />
            <EditableProfileField
              label="Communication Style"
              field="communicationStyle"
              value={summary.profile.communicationStyle}
              onSave={handleUpdateField}
            />
            <EditableProfileField
              label="Growth Stage"
              field="growthStage"
              value={summary.profile.growthStage}
              onSave={handleUpdateField}
            />
          </div>
        </div>
      )}

      {/* Recommendations */}
      {summary?.recommendations && summary.recommendations.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="trending-up" size={18} className="text-primary" />
            AI Recommendations
          </h3>
          <div className="space-y-3">
            {summary.recommendations.map((rec, index) => (
              <div
                key={index}
                className="bg-muted/50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="check" size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm mb-1">
                      {rec.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {rec.description}
                    </p>
                    {rec.feature && (
                      <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {rec.feature}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-run Interview */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground text-sm">Update Business Profile</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Re-run the interview to update your AI profile
            </p>
          </div>
          <Button variant="outline" onClick={handleStartInterview}>
            <Icon name="refresh-cw" size={16} />
            Re-run Interview
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <p className="text-sm text-foreground capitalize">{value}</p>
    </div>
  );
}

function EditableProfileField({
  label,
  field,
  value,
  type = "text",
  onSave,
}: {
  label: string;
  field: ProfileField;
  value: unknown;
  type?: "text" | "number";
  onSave: (field: ProfileField, value: unknown) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(() =>
    value == null ? "" : String(value)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const nextValue = type === "number" ? Number(draft) : draft.trim();
      await onSave(field, nextValue);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile field:", err);
      setError("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    if (value == null || value === "") {
      return (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => setEditing(true)}
          >
            Add {label}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <p className="text-sm text-foreground capitalize">{String(value)}</p>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <input
        type={type}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(value == null ? "" : String(value));
            setEditing(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
