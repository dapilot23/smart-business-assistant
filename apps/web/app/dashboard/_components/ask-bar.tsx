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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-200"
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
          className="h-11 w-full rounded-full border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
        />
      </div>
      <button
        onClick={runPrompt}
        className="h-11 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
      >
        Run
      </button>
      <ChatButton initialPrompt={queuedPrompt} promptKey={promptKey} />
    </div>
  );
}
