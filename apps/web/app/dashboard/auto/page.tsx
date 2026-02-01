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
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Autopilot</h1>
        <p className="text-sm text-slate-400">Choose how hands-off the AI should be.</p>
      </section>

      <section className="glass-panel rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mode</p>
            <h2 className="mt-2 font-display text-lg text-slate-100">Execution mode</h2>
          </div>
          {saving && <span className="text-xs text-slate-400">Saving...</span>}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {modes.map((item) => (
            <button
              key={item.id}
              onClick={() => saveSettings({ autopilotMode: item.id })}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                mode === item.id
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="text-sm font-semibold text-slate-100">{item.label}</div>
              <div className="mt-1 text-xs text-slate-400">{item.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Teams</p>
            <h2 className="mt-2 font-display text-lg text-slate-100">Agents on/off</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] text-slate-400">
              {settings ? "Configured" : "Loading"}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {agentToggles.map((toggle) => {
              const enabled = settings ? settings[toggle.key] : false;
              return (
                <div
                  key={toggle.key}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{toggle.label}</div>
                    <div className="text-xs text-slate-400">Agent enabled</div>
                  </div>
                  <button
                    onClick={() =>
                      saveSettings({ [toggle.key]: !enabled } as Partial<AgentSettings>)
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      enabled
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    {enabled ? "On" : "Off"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Limits</p>
            <h2 className="mt-2 font-display text-lg text-slate-100">Risk controls</h2>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Discount limit (%)</div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountInput}
                  onChange={(event) => setDiscountInput(event.target.value)}
                  className="h-10 w-24 rounded-full border border-white/10 bg-white/5 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none"
                />
                <button
                  onClick={() => saveSettings({ maxDiscountPercent: Number(discountInput) || 0 })}
                  className="h-10 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-medium text-slate-300 hover:border-emerald-400/40"
                >
                  Update
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">AI discounts above this require approval.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              Refund guardrails: coming soon
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              Sentiment escalation: coming soon
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
