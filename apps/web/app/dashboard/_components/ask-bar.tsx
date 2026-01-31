"use client";

import { useState } from "react";
import { ChatButton } from "@/components/ai-copilot";
import { Icon } from "../../components/Icon";

export function AskBar() {
  const [prompt, setPrompt] = useState("");
  const [queuedPrompt, setQueuedPrompt] = useState<string | undefined>(undefined);
  const [promptKey, setPromptKey] = useState(0);

  const runPrompt = () => {
    if (!prompt.trim()) return;
    setQueuedPrompt(prompt.trim());
    setPromptKey((prev) => prev + 1);
    setPrompt("");
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Icon
          name="sparkles"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runPrompt();
            }
          }}
          placeholder="Ask your AI employee to handle sales, support, or follow-ups..."
          className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
        />
      </div>
      <button
        onClick={runPrompt}
        className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Run
      </button>
      <ChatButton initialPrompt={queuedPrompt} promptKey={promptKey} />
    </div>
  );
}
