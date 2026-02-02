"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatButton } from "@/components/ai-copilot";
import { Icon } from "../../components/Icon";

type AskBarProps = {
  suggestions?: string[];
  onRun?: (prompt: string) => Promise<void> | void;
};

export function AskBar({ suggestions = [], onRun }: AskBarProps) {
  const [prompt, setPrompt] = useState("");
  const [queuedPrompt, setQueuedPrompt] = useState<string | undefined>(undefined);
  const [promptKey, setPromptKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runPrompt = useCallback(
    async (value?: string) => {
      if (isSubmitting) return;
      const nextPrompt = (value ?? prompt).trim();
      if (!nextPrompt) return;
      setQueuedPrompt(nextPrompt);
      setPromptKey((prev) => prev + 1);
      setPrompt("");
      if (!onRun) return;
      try {
        setIsSubmitting(true);
        await onRun(nextPrompt);
      } catch (error) {
        console.error("Failed to run prompt", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, onRun, prompt]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      if (detail?.prompt) {
        runPrompt(detail.prompt);
      }
    };

    window.addEventListener("command-center:run-task", handler as EventListener);
    return () => window.removeEventListener("command-center:run-task", handler as EventListener);
  }, [runPrompt]);

  return (
    <div className="flex flex-col gap-3">
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
            placeholder="Ask the AI to run a task..."
            disabled={isSubmitting}
            className="h-11 w-full rounded-full border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none disabled:opacity-60"
          />
        </div>
        <button
          onClick={() => runPrompt()}
          disabled={isSubmitting}
          className="h-11 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
        >
          {isSubmitting ? "Working..." : "Run"}
        </button>
        <ChatButton initialPrompt={queuedPrompt} promptKey={promptKey} />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => runPrompt(suggestion)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-white/20"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
