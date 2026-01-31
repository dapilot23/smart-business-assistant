"use client";

import { useEffect, useState } from "react";
import { getAgentSettings, updateAgentSettings, type AutopilotMode, type AgentSettings } from "@/lib/api/agents";

const modes: { id: AutopilotMode; label: string; description: string }[] = [
  { id: "SUGGEST", label: "Suggest only", description: "AI recommends, you decide." },
  { id: "DRAFT", label: "Draft + ask", description: "AI drafts and waits for approval." },
  { id: "AUTO", label: "Auto-execute", description: "AI runs playbooks within guardrails." },
];

const agentToggles = [
  { key: "revenueAgentEnabled", label: "Revenue + Sales" },
  { key: "customerAgentEnabled", label: "Customer Support" },
  { key: "operationsAgentEnabled", label: "Operations" },
  { key: "marketingAgentEnabled", label: "Marketing" },
] as const;

export default function AutopilotPage() {
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [discountInput, setDiscountInput] = useState("10");

  useEffect(() => {
    async function load() {
      try {
        const data = await getAgentSettings();
        setSettings(data);
        setDiscountInput(String(data.maxDiscountPercent ?? 10));
      } catch (error) {
        console.error("Failed to load agent settings", error);
      }
    }

    load();
  }, []);

  const mode = settings?.autopilotMode ?? "DRAFT";
  const saveSettings = async (updates: Partial<AgentSettings>) => {
    try {
      setSaving(true);
      const updated = await updateAgentSettings(updates);
      setSettings(updated);
    } catch (error) {
      console.error("Failed to update settings", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border-subtle bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">Autopilot</h1>
        <p className="text-sm text-muted-foreground">
          Choose how hands-off your AI employee should be.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {modes.map((item) => (
            <button
              key={item.id}
              onClick={() => saveSettings({ autopilotMode: item.id })}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                mode === item.id
                  ? "border-primary/40 bg-primary/10"
                  : "border-border-subtle bg-background hover:bg-secondary"
              }`}
            >
              <div className="text-sm font-semibold text-foreground">{item.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
            </button>
          ))}
        </div>
        {saving && (
          <p className="mt-3 text-xs text-muted-foreground">Saving changes…</p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border-subtle bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI departments</h2>
              <p className="text-sm text-muted-foreground">Toggle which teams can act.</p>
            </div>
            <button className="rounded-full border border-border-subtle bg-background px-4 py-2 text-xs font-medium text-muted-foreground">
              {settings ? "Configured" : "Loading"}
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {agentToggles.map((toggle) => {
              const enabled = settings ? settings[toggle.key] : false;
              return (
                <div
                  key={toggle.key}
                  className="flex items-center justify-between rounded-2xl border border-border-subtle bg-background px-4 py-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">{toggle.label}</div>
                    <div className="text-xs text-muted-foreground">Agent enabled</div>
                  </div>
                  <button
                    onClick={() =>
                      saveSettings({ [toggle.key]: !enabled } as Partial<AgentSettings>)
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      enabled
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border-subtle bg-card text-muted-foreground"
                    }`}
                  >
                    {enabled ? "On" : "Off"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Guardrails</h2>
          <p className="text-sm text-muted-foreground">Protect the business while AI runs.</p>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Discount limit (%)
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountInput}
                  onChange={(event) => setDiscountInput(event.target.value)}
                  className="h-10 w-24 rounded-full border border-border bg-card px-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                />
                <button
                  onClick={() =>
                    saveSettings({ maxDiscountPercent: Number(discountInput) || 0 })
                  }
                  className="h-10 rounded-full border border-border-subtle bg-card px-4 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Update
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                AI discounts above this require approval.
              </p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              Refunds over $100 require approval
            </div>
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              Escalate negative sentiment immediately
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
