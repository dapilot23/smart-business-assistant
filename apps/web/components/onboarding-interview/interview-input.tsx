"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/app/components/Icon";

interface InterviewInputProps {
  onSend: (message: string) => void;
  onSkip: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InterviewInput({
  onSend,
  onSkip,
  disabled = false,
  placeholder = "Type your answer...",
}: InterviewInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-card border-t border-border p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="
                w-full px-4 py-3
                bg-muted border border-border rounded-xl
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-none
                text-sm
              "
            />
          </div>
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="
              h-12 w-12 flex items-center justify-center
              bg-primary text-primary-foreground rounded-xl
              hover:opacity-90 transition-opacity
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {disabled ? (
              <Icon name="loader-2" size={20} className="animate-spin" />
            ) : (
              <Icon name="send" size={20} />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="
              text-sm text-muted-foreground hover:text-foreground
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-1
            "
          >
            <Icon name="chevron-right" size={14} />
            Skip this question
          </button>
          <span className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>
      </form>
    </div>
  );
}
