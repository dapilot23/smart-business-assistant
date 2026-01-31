"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import {
  ConversationThread,
  Message,
  getConversation,
  listConversations,
  sendMessage,
  markConversationRead,
} from "@/lib/api/messaging";

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [current, setCurrent] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  useEffect(() => {
    async function loadConversations() {
      try {
        setLoading(true);
        const data = await listConversations();
        setConversations(data);
        if (data.length > 0) {
          await selectConversation(data[0].id);
        }
      } catch (error) {
        console.error("Failed to load inbox", error);
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
  }, []);

  async function selectConversation(id: string) {
    setSelectedId(id);
    setLoadingThread(true);
    try {
      const conversation = await getConversation(id);
      setCurrent(conversation);
      setMessages(conversation.messages ?? []);
      await markConversationRead(id);
    } catch (error) {
      console.error("Failed to load conversation", error);
    } finally {
      setLoadingThread(false);
    }
  }

  async function handleSend() {
    if (!current || !messageInput.trim()) return;
    try {
      await sendMessage(current.id, messageInput.trim());
      setMessageInput("");
      await selectConversation(current.id);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  }

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <section className="rounded-2xl border border-border-subtle bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Inbox</h1>
            <p className="text-sm text-muted-foreground">All sales + support in one list.</p>
          </div>
          <span className="rounded-full border border-border-subtle bg-background px-3 py-1 text-xs text-muted-foreground">
            {conversations.length} threads
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="loader-2" size={16} className="animate-spin" />
              Loading inbox…
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-subtle bg-background px-4 py-6 text-sm text-muted-foreground">
              No conversations yet. Your AI employee will surface leads here.
            </div>
          ) : (
            sortedConversations.map((thread) => (
              <button
                key={thread.id}
                onClick={() => selectConversation(thread.id)}
                className={`flex w-full flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  selectedId === thread.id
                    ? "border-primary/40 bg-primary/10"
                    : "border-border-subtle bg-background hover:bg-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {thread.customerName ?? "Unknown customer"}
                  </span>
                  {thread.unreadCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {thread.lastMessagePreview ?? "No messages yet"}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{thread.channel}</span>
                  <span>•</span>
                  <span>{thread.status}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Focus view</h2>
            <p className="text-sm text-muted-foreground">
              {current ? `Talking with ${current.customerName ?? "customer"}` : "Select a thread"}
            </p>
          </div>
          <span className="rounded-full border border-border-subtle bg-background px-3 py-1 text-xs text-muted-foreground">
            AI draft ready
          </span>
        </div>

        <div className="mt-4 flex h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl border border-border-subtle bg-background p-4">
          {loadingThread ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="loader-2" size={16} className="animate-spin" />
              Loading thread…
            </div>
          ) : current ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  message.direction === "OUTBOUND"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                {message.content}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Pick a conversation to see details.</div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3 text-sm text-muted-foreground">
            AI suggestion: "Happy to help - your order is scheduled for Friday at 2 PM. Want me to confirm?"
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Type a response or ask the AI to draft one…"
              className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
            />
            <button
              onClick={handleSend}
              className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
