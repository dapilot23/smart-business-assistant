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
          'fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'transition-all hover:scale-105 hover:shadow-xl',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
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
