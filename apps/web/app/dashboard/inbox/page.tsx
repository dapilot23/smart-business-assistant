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
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">
            Active queue
          </span>
          <span className="font-primary text-emerald-200/80">&gt; ./business-os --inbox</span>
        </div>
        <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Inbox control</h1>
        <p className="text-sm text-slate-400">
          Unify sales and support threads. Let the AI draft, you decide what ships.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Command inbox</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">Threads</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">
              {conversations.length} active
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon name="loader-2" size={16} className="animate-spin" />
                Loading inbox...
              </div>
            ) : sortedConversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                No conversations yet. Your AI employee will surface leads here.
              </div>
            ) : (
              sortedConversations.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => selectConversation(thread.id)}
                  className={`flex w-full flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selectedId === thread.id
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-100">
                      {thread.customerName ?? "Unknown customer"}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {thread.lastMessagePreview ?? "No messages yet"}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{thread.channel}</span>
                    <span>•</span>
                    <span>{thread.status}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Focus view</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">Conversation</h2>
              <p className="text-xs text-slate-400">
                {current ? `Talking with ${current.customerName ?? "customer"}` : "Select a thread"}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">
              AI draft ready
            </span>
          </div>

          <div className="mt-4 flex h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            {loadingThread ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon name="loader-2" size={16} className="animate-spin" />
                Loading thread...
              </div>
            ) : current ? (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    message.direction === "OUTBOUND"
                      ? "ml-auto bg-emerald-400 text-slate-950"
                      : "bg-white/5 text-slate-100"
                  }`}
                >
                  {message.content}
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-400">Pick a conversation to see details.</div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              AI suggestion: Happy to help - your order is scheduled for Friday at 2 PM. Want me to confirm?
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder="Type a response or ask the AI to draft one..."
                className="h-11 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
              />
              <button
                onClick={handleSend}
                className="h-11 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
