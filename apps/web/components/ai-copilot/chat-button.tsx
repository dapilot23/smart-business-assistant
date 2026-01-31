'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ChatPanel } from './chat-panel';
import { cn } from '@/lib/utils';

export function ChatButton({
  initialPrompt,
  promptKey,
}: {
  initialPrompt?: string;
  promptKey?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!initialPrompt) return;
    setQueuedPrompt(initialPrompt);
    setIsOpen(true);
  }, [initialPrompt, promptKey]);

  const handlePromptHandled = () => setQueuedPrompt(undefined);

  const openPanel = () => setIsOpen(true);

  return (
    <>
      <button
        onClick={openPanel}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40',
          'bg-emerald-400 text-slate-950 shadow-[0_12px_28px_rgba(0,0,0,0.45)]',
          'transition-all hover:bg-emerald-300',
          'focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#0b0d12]'
        )}
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <ChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialPrompt={queuedPrompt}
        promptKey={promptKey}
        onPromptHandled={handlePromptHandled}
      />
    </>
  );
}
