"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const RECENT_COMMANDS_KEY = "businessOS:recentCommands";
const MAX_RECENT = 6;

type CommandGroup = "Recent" | "Navigation" | "Actions" | "Inbox" | "Insights" | "System";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  group: CommandGroup;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
}

function isTypingElement(target: EventTarget | null) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    target.isContentEditable
  );
}

function loadRecentCommands(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_COMMANDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentCommands(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(ids));
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const dispatchEvent = (name: string, detail?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  const navigationCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: "Go to Today",
        description: "Command Center",
        group: "Navigation",
        shortcut: "⌘1",
        action: () => router.push("/dashboard"),
      },
      {
        id: "nav-inbox",
        label: "Go to Inbox",
        description: "Customer messages",
        group: "Navigation",
        shortcut: "⌘2",
        action: () => router.push("/dashboard/inbox"),
      },
      {
        id: "nav-insights",
        label: "Go to Insights",
        description: "Weekly snapshot",
        group: "Navigation",
        shortcut: "⌘3",
        action: () => router.push("/dashboard/insights"),
      },
      {
        id: "nav-money",
        label: "Go to Money",
        description: "Quotes and invoices",
        group: "Navigation",
        shortcut: "⌘4",
        action: () => router.push("/dashboard/money"),
      },
      {
        id: "nav-autopilot",
        label: "Go to Autopilot",
        description: "Automation controls",
        group: "Navigation",
        shortcut: "⌘5",
        action: () => router.push("/dashboard/auto"),
      },
      {
        id: "nav-settings",
        label: "Open Settings",
        description: "Business preferences",
        group: "Navigation",
        action: () => router.push("/dashboard/settings"),
      },
    ],
    [router]
  );

  const actionCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "action-approve-next",
        label: "Approve next action",
        description: "Approve the top item",
        group: "Actions",
        shortcut: "Shift + A",
        action: () => dispatchEvent("command-center:approve-next"),
      },
      {
        id: "action-decline-next",
        label: "Decline next action",
        description: "Skip the top item",
        group: "Actions",
        shortcut: "Shift + D",
        action: () => dispatchEvent("command-center:decline-next"),
      },
      {
        id: "action-send-invoices",
        label: "Run: Send overdue invoices",
        description: "Queue billing follow-ups",
        group: "Actions",
        action: () => dispatchEvent("command-center:run-task", { prompt: "Send overdue invoices" }),
      },
      {
        id: "action-follow-leads",
        label: "Run: Follow up new leads",
        description: "Queue sales follow-ups",
        group: "Actions",
        action: () => dispatchEvent("command-center:run-task", { prompt: "Follow up new leads" }),
      },
      {
        id: "action-close-tickets",
        label: "Run: Close open tickets",
        description: "Queue support clean-up",
        group: "Actions",
        action: () => dispatchEvent("command-center:run-task", { prompt: "Close open tickets" }),
      },
    ],
    []
  );

  const inboxCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "inbox-focus-reply",
        label: "Focus reply box",
        description: "Jump to reply input",
        group: "Inbox",
        shortcut: "Shift + R",
        action: () => dispatchEvent("inbox:focus-reply"),
      },
      {
        id: "inbox-send-reply",
        label: "Send reply",
        description: "Send the current draft",
        group: "Inbox",
        shortcut: "Shift + S",
        action: () => dispatchEvent("inbox:send-reply"),
      },
    ],
    []
  );

  const insightsCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "insights-generate",
        label: "Generate new report",
        description: "Create the latest insights",
        group: "Insights",
        action: () => dispatchEvent("insights:generate-report"),
      },
      {
        id: "insights-full-report",
        label: "View full report",
        description: "Jump to weekly details",
        group: "Insights",
        action: () => {
          if (pathname === "/dashboard/insights") {
            document.getElementById("full-report")?.scrollIntoView({ behavior: "smooth" });
          } else {
            router.push("/dashboard/insights#full-report");
          }
        },
      },
    ],
    [pathname, router]
  );

  const systemCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "system-open-palette",
        label: "Open command palette",
        description: "Find anything fast",
        group: "System",
        shortcut: "⌘K",
        action: () => setOpen(true),
      },
    ],
    []
  );

  const contextualCommands = useMemo(() => {
    if (pathname === "/dashboard") return actionCommands;
    if (pathname?.startsWith("/dashboard/inbox")) return inboxCommands;
    if (pathname?.startsWith("/dashboard/insights")) return insightsCommands;
    return [] as CommandItem[];
  }, [actionCommands, inboxCommands, insightsCommands, pathname]);

  const allCommands = useMemo(
    () => [...navigationCommands, ...contextualCommands, ...systemCommands],
    [navigationCommands, contextualCommands, systemCommands]
  );

  const commandMap = useMemo(() => {
    return new Map(allCommands.map((command) => [command.id, command]));
  }, [allCommands]);

  const queryValue = query.trim().toLowerCase();

  const filteredCommands = useMemo(() => {
    if (!queryValue) return allCommands;
    return allCommands.filter((command) => {
      const haystack = [
        command.label,
        command.description ?? "",
        ...(command.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(queryValue);
    });
  }, [allCommands, queryValue]);

  const recentCommands = useMemo(() => {
    if (queryValue) return [];
    return recentIds
      .map((id) => commandMap.get(id))
      .filter((command): command is CommandItem => Boolean(command));
  }, [commandMap, queryValue, recentIds]);

  const commandList = useMemo(() => {
    if (queryValue) return filteredCommands;
    const recentSet = new Set(recentCommands.map((command) => command.id));
    return [...recentCommands, ...allCommands.filter((command) => !recentSet.has(command.id))];
  }, [allCommands, filteredCommands, queryValue, recentCommands]);

  useEffect(() => {
    if (!open) return;
    setRecentIds(loadRecentCommands());
    setQuery("");
    setActiveIndex(0);
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [queryValue]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      const targetIsTyping = isTypingElement(event.target);

      if (isMeta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (targetIsTyping) return;

      if (isMeta && event.key === "1") {
        event.preventDefault();
        router.push("/dashboard");
      } else if (isMeta && event.key === "2") {
        event.preventDefault();
        router.push("/dashboard/inbox");
      } else if (isMeta && event.key === "3") {
        event.preventDefault();
        router.push("/dashboard/insights");
      } else if (isMeta && event.key === "4") {
        event.preventDefault();
        router.push("/dashboard/money");
      } else if (isMeta && event.key === "5") {
        event.preventDefault();
        router.push("/dashboard/auto");
      } else if (event.shiftKey && event.key.toLowerCase() === "a" && pathname === "/dashboard") {
        event.preventDefault();
        dispatchEvent("command-center:approve-next");
      } else if (event.shiftKey && event.key.toLowerCase() === "d" && pathname === "/dashboard") {
        event.preventDefault();
        dispatchEvent("command-center:decline-next");
      } else if (event.shiftKey && event.key.toLowerCase() === "r" && pathname?.startsWith("/dashboard/inbox")) {
        event.preventDefault();
        dispatchEvent("inbox:focus-reply");
      } else if (event.shiftKey && event.key.toLowerCase() === "s" && pathname?.startsWith("/dashboard/inbox")) {
        event.preventDefault();
        dispatchEvent("inbox:send-reply");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router]);

  const runCommand = (command: CommandItem | undefined) => {
    if (!command) return;
    command.action();
    setOpen(false);
    const nextRecent = [command.id, ...recentIds.filter((id) => id !== command.id)].slice(
      0,
      MAX_RECENT
    );
    setRecentIds(nextRecent);
    saveRecentCommands(nextRecent);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (commandList.length ? (prev + 1) % commandList.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        commandList.length ? (prev - 1 + commandList.length) % commandList.length : 0
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      runCommand(commandList[activeIndex]);
    }
  };

  const renderGroupHeader = (label: string) => (
    <div className="px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
      {label}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl border border-white/10 bg-[#0b0d12] p-0 text-slate-100 shadow-[0_25px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search commands, pages, and actions..."
            className="h-10 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400 sm:flex">
            <CornerDownLeft className="h-3 w-3" />
            Enter
          </span>
        </div>

        <div className="max-h-[420px] overflow-y-auto py-2">
          {commandList.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400">No matches found.</div>
          ) : (
            <>
              {!queryValue && recentCommands.length > 0 && renderGroupHeader("Recent")}
              {!queryValue &&
                recentCommands.map((command) => {
                  const isActive = commandList[activeIndex]?.id === command.id;
                  return (
                    <button
                      key={command.id}
                      onClick={() => runCommand(command)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm",
                        isActive ? "bg-emerald-400/10 text-emerald-100" : "text-slate-200"
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="font-semibold">{command.label}</span>
                        {command.description && (
                          <span className="text-xs text-slate-400">{command.description}</span>
                        )}
                      </span>
                      {command.shortcut && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                          {command.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}

              {(!queryValue || recentCommands.length > 0) &&
                renderGroupHeader(queryValue ? "Results" : "Commands")}

              {allCommands
                .filter((command) => {
                  if (queryValue) return filteredCommands.includes(command);
                  return !recentCommands.some((recent) => recent.id === command.id);
                })
                .map((command) => {
                  const isActive = commandList[activeIndex]?.id === command.id;
                  return (
                    <button
                      key={command.id}
                      onClick={() => runCommand(command)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm",
                        isActive ? "bg-emerald-400/10 text-emerald-100" : "text-slate-200"
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="font-semibold">{command.label}</span>
                        {command.description && (
                          <span className="text-xs text-slate-400">{command.description}</span>
                        )}
                      </span>
                      {command.shortcut && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                          {command.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3 text-[11px] text-slate-500">
          <span>⌘K to open</span>
          <span>⌘1–5 to navigate</span>
          <span>Shift+A/D to approve/decline</span>
          <span>Shift+R/S for inbox</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
