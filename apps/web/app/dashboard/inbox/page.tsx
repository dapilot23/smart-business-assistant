"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import {
  ConversationThread,
  Message,
  getConversation,
  listConversations,
  sendMessage,
  markConversationRead,
} from "@/lib/api/messaging";

function formatRecentRange(days = 7) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const format = (value: Date) =>
    value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return `${format(start)} - ${format(end)}`;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [current, setCurrent] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const replyInputRef = useRef<HTMLInputElement | null>(null);

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
  }, [selectConversation]);

  const selectConversation = useCallback(async (id: string) => {
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
  }, []);

  const handleSend = useCallback(async () => {
    if (!current || !messageInput.trim()) return;
    try {
      await sendMessage(current.id, messageInput.trim());
      setMessageInput("");
      await selectConversation(current.id);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  }, [current, messageInput, selectConversation]);

  useEffect(() => {
    const handleFocusReply = () => replyInputRef.current?.focus();
    const handleSendReply = () => handleSend();

    window.addEventListener("inbox:focus-reply", handleFocusReply as EventListener);
    window.addEventListener("inbox:send-reply", handleSendReply as EventListener);
    return () => {
      window.removeEventListener("inbox:focus-reply", handleFocusReply as EventListener);
      window.removeEventListener("inbox:send-reply", handleSendReply as EventListener);
    };
  }, [handleSend]);

  const getThreadBadge = (thread: ConversationThread) => {
    const status = thread.status?.toLowerCase() ?? "";
    const priority = thread.priority?.toLowerCase?.() ?? "";
    const hasTag = (tag: string) =>
      thread.tags?.some((entry) => entry?.toLowerCase().includes(tag)) ?? false;

    const isEscalated = status.includes("escalat") || hasTag("escalat");
    const isHandoff = status.includes("handoff") || hasTag("handoff") || Boolean(thread.assignedTo);
    const isUrgent = status.includes("urgent") || status.includes("high") || priority.includes("high");

    if (isEscalated) {
      return {
        label: "Escalated",
        classes: "border-amber-400/40 bg-amber-400/10 text-amber-200",
      };
    }

    if (isHandoff) {
      return {
        label: "Handoff",
        classes: "border-sky-400/40 bg-sky-400/10 text-sky-200",
      };
    }

    if (isUrgent) {
      return {
        label: "Urgent",
        classes: "border-rose-400/40 bg-rose-400/10 text-rose-200",
      };
    }

    if (thread.unreadCount > 0) {
      return {
        label: "Needs reply",
        classes: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
      };
    }

    if (status.includes("done") || status.includes("closed") || status.includes("resolved")) {
      return {
        label: "Done",
        classes: "border-white/10 bg-white/5 text-slate-400",
      };
    }

    return {
      label: "Waiting",
      classes: "border-white/10 bg-white/5 text-slate-300",
    };
  };

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations]);

  const rangeLabel = formatRecentRange();
  const needsReplyCount = conversations.filter((thread) => thread.unreadCount > 0).length;
  const urgentCount = conversations.filter((thread) => {
    const status = thread.status?.toLowerCase() ?? "";
    const priority = thread.priority?.toLowerCase?.() ?? "";
    return status.includes("urgent") || status.includes("high") || priority.includes("high");
  }).length;
  const escalatedCount = conversations.filter((thread) => {
    const status = thread.status?.toLowerCase() ?? "";
    const hasTag = (tag: string) =>
      thread.tags?.some((entry) => entry?.toLowerCase().includes(tag)) ?? false;
    return status.includes("escalat") || hasTag("escalat");
  }).length;
  const handoffCount = conversations.filter((thread) => {
    const status = thread.status?.toLowerCase() ?? "";
    const hasTag = (tag: string) =>
      thread.tags?.some((entry) => entry?.toLowerCase().includes(tag)) ?? false;
    return status.includes("handoff") || hasTag("handoff") || Boolean(thread.assignedTo);
  }).length;
  const waitingCount = Math.max(
    conversations.length - needsReplyCount - urgentCount - escalatedCount - handoffCount,
    0
  );
  const statusText = loading ? "Loading..." : `${needsReplyCount} need reply`;
  const summarySegments = [
    `${needsReplyCount} need reply`,
    urgentCount > 0 ? `${urgentCount} urgent` : null,
    escalatedCount > 0 ? `${escalatedCount} escalated` : null,
    handoffCount > 0 ? `${handoffCount} handoff` : null,
    `${waitingCount} waiting`,
  ].filter(Boolean);
  const summaryText = loading ? "Loading..." : summarySegments.join(", ");

  const currentBadge = current ? getThreadBadge(current) : null;
  const nextStep =
    currentBadge?.label === "Escalated"
      ? "Owner review"
      : currentBadge?.label === "Handoff"
        ? "Assigned follow-up"
        : currentBadge?.label === "Needs reply"
          ? "Reply to customer"
          : currentBadge?.label === "Urgent"
            ? "Respond now"
            : currentBadge?.label === "Waiting"
              ? "Waiting on customer"
              : currentBadge?.label === "Done"
                ? "No action"
                : "Select a thread";

  const statusTags: string[] = [];
  if (currentBadge?.label === "Escalated") statusTags.push("Escalated");
  if (currentBadge?.label === "Handoff") {
    statusTags.push(current?.assignedTo ? `Assigned to ${current.assignedTo}` : "Handoff");
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
          <span className="text-slate-200">Status:</span>
          <span>{statusText}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-200">Range:</span>
          <span>{rangeLabel}</span>
        </div>
        <div>
          <h1 className="font-display text-3xl text-slate-100 sm:text-4xl">Inbox</h1>
          <p className="text-sm text-slate-400">Customer messages, sorted by need.</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Threads</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">All conversations</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">
              {conversations.length} total
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI summary</p>
            <p className="mt-2 text-sm text-slate-200">{summaryText}</p>
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
                    {(() => {
                      const badge = getThreadBadge(thread);
                      return (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <span className="text-xs text-slate-400">
                    {thread.lastMessagePreview ?? "No messages yet"}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{thread.channel}</span>
                    {thread.unreadCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{thread.unreadCount} new</span>
                      </>
                    )}
                    {thread.assignedTo && (
                      <>
                        <span>•</span>
                        <span>Assigned to {thread.assignedTo}</span>
                      </>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Conversation</p>
              <h2 className="mt-2 font-display text-lg text-slate-100">Thread detail</h2>
              <p className="text-xs text-slate-400">
                {current ? `Talking with ${current.customerName ?? "customer"}` : "Select a thread"}
              </p>
            </div>
          </div>

          {current && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Summary</p>
              <p className="mt-2 text-sm text-slate-200">
                {current.lastMessagePreview ?? "No summary yet."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Next: {nextStep}
                </span>
                {statusTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              ref={replyInputRef}
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Write a reply..."
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
              className="h-11 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
            />
            <button
              onClick={handleSend}
              className="h-11 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
