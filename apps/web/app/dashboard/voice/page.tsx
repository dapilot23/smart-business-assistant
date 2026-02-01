"use client";

import { useState, useEffect } from "react";
import { Icon } from "../../components/Icon";

type TabType = "assistant" | "calls" | "test" | "webhooks";

interface CallLog {
  id: string;
  callerPhone: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  duration: number;
  createdAt: string;
  summary?: string;
}

interface AssistantConfig {
  name: string;
  firstMessage: string;
  systemPrompt: string;
  voice: string;
  model: string;
}

export default function VoicePage() {
  const [activeTab, setActiveTab] = useState<TabType>("assistant");

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center justify-between h-20 px-8 border-b border-[var(--border)]">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-primary text-[20px] font-semibold text-[var(--foreground)]">
            Voice
          </h1>
          <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
            Configure your phone assistant.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-8 pt-6 border-b border-[var(--border)]">
        <TabButton active={activeTab === "assistant"} onClick={() => setActiveTab("assistant")}>
          <Icon name="bot" size={16} />
          Assistant
        </TabButton>
        <TabButton active={activeTab === "calls"} onClick={() => setActiveTab("calls")}>
          <Icon name="phone-call" size={16} />
          Calls
        </TabButton>
        <TabButton active={activeTab === "test"} onClick={() => setActiveTab("test")}>
          <Icon name="phone-outgoing" size={16} />
          Test
        </TabButton>
        <TabButton active={activeTab === "webhooks"} onClick={() => setActiveTab("webhooks")}>
          <Icon name="external-link" size={16} />
          Webhooks
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === "assistant" && <AssistantConfigTab />}
        {activeTab === "calls" && <CallLogsTab />}
        {activeTab === "test" && <TestCallTab />}
        {activeTab === "webhooks" && <WebhooksTab />}
      </div>
    </main>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-secondary text-[14px] font-medium border-b-2 -mb-[1px] transition-colors ${
        active
          ? "text-[var(--primary)] border-[var(--primary)]"
          : "text-[var(--muted-foreground)] border-transparent hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function AssistantConfigTab() {
  const [config, setConfig] = useState<AssistantConfig>({
    name: "Business Assistant",
    firstMessage: "Hello! Thanks for calling. How can I help you today?",
    systemPrompt: `You are a helpful AI assistant for a service business. Your role is to:
1. Greet callers professionally
2. Help them book appointments
3. Provide business information (hours, services, pricing)
4. Collect customer contact information
5. Transfer to a human when needed

Be friendly, concise, and professional. If you don't know something, offer to transfer to a human.`,
    voice: "andrew",
    model: "gpt-4",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const voices = [
    { id: "andrew", name: "Andrew (Male, Professional)" },
    { id: "allison", name: "Allison (Female, Friendly)" },
    { id: "aria", name: "Aria (Female, Professional)" },
    { id: "davis", name: "Davis (Male, Casual)" },
  ];

  const models = [
    { id: "gpt-4", name: "GPT-4 (Recommended)" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo (Faster)" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (Budget)" },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/voice/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save assistant config:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Assistant Name */}
      <FormField label="Assistant Name" description="The name of your AI assistant">
        <input
          type="text"
          value={config.name}
          onChange={(e) => setConfig({ ...config, name: e.target.value })}
          className="w-full h-10 px-4 bg-[var(--card)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
        />
      </FormField>

      {/* Voice Selection */}
      <FormField label="Voice" description="Choose the voice for your assistant">
        <select
          value={config.voice}
          onChange={(e) => setConfig({ ...config, voice: e.target.value })}
          className="w-full h-10 px-4 bg-[var(--card)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
        >
          {voices.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </FormField>

      {/* Model Selection */}
      <FormField label="AI Model" description="Select the AI model for conversations">
        <select
          value={config.model}
          onChange={(e) => setConfig({ ...config, model: e.target.value })}
          className="w-full h-10 px-4 bg-[var(--card)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </FormField>

      {/* First Message */}
      <FormField label="Greeting Message" description="The first message callers will hear">
        <textarea
          value={config.firstMessage}
          onChange={(e) => setConfig({ ...config, firstMessage: e.target.value })}
          rows={2}
          className="w-full p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
        />
      </FormField>

      {/* System Prompt */}
      <FormField label="System Prompt" description="Instructions for how the AI should behave">
        <textarea
          value={config.systemPrompt}
          onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
          rows={8}
          className="w-full p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
        />
      </FormField>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 h-10 px-6 bg-[var(--primary)] rounded-full font-primary text-[14px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? (
            <Icon name="refresh" size={16} className="animate-spin" />
          ) : (
            <Icon name="save" size={16} />
          )}
          {saving ? "Saving..." : "Save Configuration"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 font-secondary text-[14px] text-[var(--color-success-foreground)]">
            <Icon name="check" size={16} />
            Saved successfully!
          </span>
        )}
      </div>
    </div>
  );
}

function FormField({ label, description, children }: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="font-primary text-[14px] font-medium text-[var(--foreground)]">
          {label}
        </label>
        <p className="font-secondary text-[12px] text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function CallLogsTab() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/voice/calls`);
      if (res.ok) {
        const data = await res.json();
        setCalls(data);
      }
    } catch (err) {
      console.error("Failed to fetch calls:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ENDED": return "bg-[var(--color-success)] text-[var(--color-success-foreground)]";
      case "IN_PROGRESS": return "bg-blue-900 text-blue-300";
      case "FAILED": return "bg-red-900 text-red-300";
      default: return "bg-[var(--card)] text-[var(--muted-foreground)]";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="refresh" size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon name="phone-call" size={48} className="text-[var(--muted-foreground)]" />
        <div className="text-center">
          <p className="font-primary text-[16px] text-[var(--foreground)]">No calls yet</p>
          <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
            Call logs will appear here when you receive or make calls
          </p>
        </div>
        <button
          onClick={fetchCalls}
          className="flex items-center gap-2 h-10 px-4 bg-[var(--card)] border border-[var(--border)] rounded-full font-secondary text-[14px] text-[var(--foreground)] hover:bg-[var(--secondary)]"
        >
          <Icon name="refresh" size={16} />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
          {calls.length} call{calls.length !== 1 ? "s" : ""} in the log
        </p>
        <button
          onClick={fetchCalls}
          className="flex items-center gap-2 h-8 px-3 bg-[var(--card)] border border-[var(--border)] rounded-full font-secondary text-[13px] text-[var(--foreground)] hover:bg-[var(--secondary)]"
        >
          <Icon name="refresh" size={14} />
          Refresh
        </button>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Direction</th>
              <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Phone</th>
              <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Status</th>
              <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Duration</th>
              <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--secondary)]">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Icon
                      name={call.direction === "INBOUND" ? "phone-incoming" : "phone-outgoing"}
                      size={16}
                      className={call.direction === "INBOUND" ? "text-green-400" : "text-blue-400"}
                    />
                    <span className="font-secondary text-[14px] text-[var(--foreground)]">
                      {call.direction === "INBOUND" ? "Incoming" : "Outgoing"}
                    </span>
                  </div>
                </td>
                <td className="p-4 font-secondary text-[14px] text-[var(--foreground)]">
                  {call.callerPhone}
                </td>
                <td className="p-4">
                  <span className={`inline-flex px-2 py-1 rounded-full font-secondary text-[12px] ${getStatusColor(call.status)}`}>
                    {call.status}
                  </span>
                </td>
                <td className="p-4 font-secondary text-[14px] text-[var(--foreground)]">
                  {formatDuration(call.duration || 0)}
                </td>
                <td className="p-4 font-secondary text-[14px] text-[var(--muted-foreground)]">
                  {formatDate(call.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TestCallTab() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestCall = async () => {
    if (!phoneNumber.trim()) {
      setCallResult({ success: false, message: "Please enter a phone number" });
      return;
    }

    setCalling(true);
    setCallResult(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/voice/call/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setCallResult({ success: true, message: `Call initiated! Call ID: ${data.id || 'pending'}` });
      } else {
        const error = await res.json();
        setCallResult({ success: false, message: error.message || "Failed to initiate call" });
      }
    } catch {
      setCallResult({ success: false, message: "Network error. Please check the API connection." });
    } finally {
      setCalling(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
        <p className="font-secondary text-[14px] text-yellow-300">
          Test your AI voice assistant by making an outbound call. The assistant will call the specified number.
        </p>
      </div>

      <FormField label="Phone Number" description="Enter the phone number to call (with country code)">
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1 (555) 123-4567"
          className="w-full h-10 px-4 bg-[var(--card)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
        />
      </FormField>

      <button
        onClick={handleTestCall}
        disabled={calling}
        className="flex items-center gap-2 h-10 px-6 bg-[var(--primary)] rounded-full font-primary text-[14px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {calling ? (
          <Icon name="refresh" size={16} className="animate-spin" />
        ) : (
          <Icon name="phone-outgoing" size={16} />
        )}
        {calling ? "Calling..." : "Make Test Call"}
      </button>

      {callResult && (
        <div className={`p-4 rounded-lg ${
          callResult.success
            ? "bg-[var(--color-success)] text-[var(--color-success-foreground)]"
            : "bg-red-900/20 border border-red-800 text-red-300"
        }`}>
          <div className="flex items-center gap-2">
            <Icon name={callResult.success ? "check" : "x"} size={16} />
            <span className="font-secondary text-[14px]">{callResult.message}</span>
          </div>
        </div>
      )}

      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <h3 className="font-primary text-[14px] font-medium text-[var(--foreground)] mb-2">
          Test Tips
        </h3>
        <ul className="list-disc list-inside space-y-1 font-secondary text-[14px] text-[var(--muted-foreground)]">
          <li>Use a real phone number you have access to</li>
          <li>The AI will greet you and try to help with booking</li>
          <li>Test various scenarios like scheduling and inquiries</li>
          <li>Check Call Logs tab afterward to see the transcript</li>
        </ul>
      </div>
    </div>
  );
}

function WebhooksTab() {
  const [copied, setCopied] = useState<string | null>(null);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const webhooks = [
    { name: "Main Webhook", url: `${baseUrl}/api/v1/voice/webhook`, description: "Handles all Vapi events (recommended)" },
    { name: "Incoming Call", url: `${baseUrl}/api/v1/voice/webhook/incoming`, description: "Triggered when a call starts" },
    { name: "Status Update", url: `${baseUrl}/api/v1/voice/webhook/status`, description: "Called when call status changes" },
    { name: "Function Call", url: `${baseUrl}/api/v1/voice/webhook/function-call`, description: "Handles AI function calls" },
    { name: "Transcript", url: `${baseUrl}/api/v1/voice/webhook/transcript`, description: "Receives call transcripts" },
  ];

  const copyToClipboard = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <p className="font-secondary text-[14px] text-blue-300">
          Configure these webhook URLs in your Vapi.ai dashboard to receive call events.
        </p>
      </div>

      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <div key={webhook.name} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-primary text-[14px] font-medium text-[var(--foreground)]">
                {webhook.name}
              </span>
              <button
                onClick={() => copyToClipboard(webhook.url, webhook.name)}
                className="flex items-center gap-1 px-2 py-1 rounded-md font-secondary text-[12px] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
              >
                <Icon name={copied === webhook.name ? "check" : "copy"} size={14} />
                {copied === webhook.name ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="font-secondary text-[12px] text-[var(--muted-foreground)] mb-2">
              {webhook.description}
            </p>
            <code className="block p-2 bg-[var(--background)] rounded font-mono text-[13px] text-[var(--primary)] overflow-x-auto">
              {webhook.url}
            </code>
          </div>
        ))}
      </div>

      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <h3 className="font-primary text-[14px] font-medium text-[var(--foreground)] mb-2">
          Vapi Dashboard Setup
        </h3>
        <ol className="list-decimal list-inside space-y-2 font-secondary text-[14px] text-[var(--muted-foreground)]">
          <li>Go to your Vapi.ai dashboard</li>
          <li>Navigate to Phone Numbers or Assistants</li>
          <li>Add the Main Webhook URL to handle all events</li>
          <li>Save your configuration</li>
        </ol>
      </div>
    </div>
  );
}
