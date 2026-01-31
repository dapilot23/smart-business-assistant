"use client";

import { useState } from "react";

const modes = [
  { id: "suggest", label: "Suggest only", description: "AI recommends, you decide." },
  { id: "draft", label: "Draft + ask", description: "AI drafts and waits for approval." },
  { id: "auto", label: "Auto-execute", description: "AI runs playbooks within guardrails." },
];

const playbooks = [
  {
    name: "New lead follow-up",
    description: "Reply within 2 minutes and book when possible.",
  },
  {
    name: "Support auto-triage",
    description: "Resolve common questions and escalate edge cases.",
  },
  {
    name: "No-show prevention",
    description: "Confirm appointments and collect deposits when needed.",
  },
  {
    name: "Review requests",
    description: "Send a review ask 24 hours after service.",
  },
];

export default function AutopilotPage() {
  const [mode, setMode] = useState("draft");

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
              onClick={() => setMode(item.id)}
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
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border-subtle bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Active playbooks</h2>
              <p className="text-sm text-muted-foreground">Turn automations on or off.</p>
            </div>
            <button className="rounded-full border border-border-subtle bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              Add playbook
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {playbooks.map((playbook) => (
              <div
                key={playbook.name}
                className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-background px-4 py-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{playbook.name}</h3>
                  <button className="rounded-full border border-border-subtle bg-card px-3 py-1 text-xs text-muted-foreground">
                    Enabled
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{playbook.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Guardrails</h2>
          <p className="text-sm text-muted-foreground">Protect the business while AI runs.</p>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3">
              Discount limit: 10%
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
