"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/app/components/Icon";

interface Message {
  role: "assistant" | "user";
  content: string;
  timestamp: string;
}

interface InterviewChatProps {
  messages: Message[];
  isTyping?: boolean;
}

export function InterviewChat({ messages, isTyping = false }: InterviewChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`
              max-w-[80%] rounded-2xl px-4 py-3
              ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }
            `}
          >
            {message.role === "assistant" && (
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="bot" size={12} className="text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
        </div>
      ))}

      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="bot" size={12} className="text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
