/**
 * ChatGlider — floating launcher + large Teams-style chat panel.
 * The panel itself is `ChatWorkspace`; this file only owns the launcher,
 * unread bookkeeping and panel sizing/persistence.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { listMyConversations, type ChatConversation } from "@/lib/chat.functions";
import { ChatWorkspace } from "@/components/support/chat/chat-workspace";

const OPEN_KEY = "opsqai.chat.open";
const ACTIVE_KEY = "opsqai.chat.active";

/**
 * Unread bookkeeping for the floating launcher.
 *
 * Reuses the per-conversation `unread_count` returned by
 * `listMyConversations` — no extra table, no realtime dependency, so it
 * behaves identically in Self-Hosted and Cloud.
 */
function useUnreadTotal(opts: { open: boolean; activeConv: string | null; enabled: boolean }) {
  const { open, activeConv, enabled } = opts;
  const list = useServerFn(listMyConversations);
  const qc = useQueryClient();
  const [pulse, setPulse] = useState(false);
  const prevTotal = useRef(0);
  const lastToast = useRef(0);

  const { data: convs = [] } = useQuery<ChatConversation[]>({
    queryKey: ["chat-conversations"],
    queryFn: () => list({ data: {} } as never),
    refetchOnWindowFocus: true,
    enabled,
  });

  // Single poller for the whole bubble (the list view reuses this cache).
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(
      () => qc.invalidateQueries({ queryKey: ["chat-conversations"] }),
      4_000,
    );
    return () => window.clearInterval(timer);
  }, [enabled, qc]);

  const suppressed = open && activeConv ? activeConv : null;
  const total = convs.reduce((n, c) => n + (c.id === suppressed ? 0 : (c.unread_count ?? 0)), 0);

  useEffect(() => {
    const prev = prevTotal.current;
    prevTotal.current = total;
    if (total <= prev || total === 0) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 1200);
    const now = Date.now();
    const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
    if ((!open || hidden) && now - lastToast.current > 8_000) {
      lastToast.current = now;
      const delta = total - prev;
      toast.message(delta === 1 ? "New message" : `${delta} new messages`, {
        description: total === 1 ? "1 unread conversation message" : `${total} unread in total`,
      });
    }
    return () => window.clearTimeout(t);
  }, [total, open]);

  // Reflect unread in the window title when the tab is in the background.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = total > 0 ? `(${total > 9 ? "9+" : total}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [total]);

  return { total, pulse };
}

export function ChatGlider() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);

  const { total: unread, pulse } = useUnreadTotal({
    open,
    activeConv,
    enabled: !loading && !!user,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(window.localStorage.getItem(OPEN_KEY) === "1");
    setActiveConv(window.localStorage.getItem(ACTIVE_KEY));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeConv) window.localStorage.setItem(ACTIVE_KEY, activeConv);
    else window.localStorage.removeItem(ACTIVE_KEY);
  }, [activeConv]);

  if (loading || !user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Open chat — ${unread} unread` : "Open chat"}
        title="Chat"
        className={cn(
          "fixed right-5 bottom-6 z-40 flex items-center justify-center rounded-md",
          "bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/40",
          "h-12 w-12 transition-transform duration-200 ease-out hover:scale-105",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "pointer-events-none opacity-0",
          pulse && "animate-pulse",
        )}
      >
        <MessageCircle className="h-5 w-5" />
        {unread > 0 && (
          <span
            data-testid="chat-unread-badge"
            className={cn(
              "absolute -top-1 -right-1 h-5 min-w-5 rounded-sm px-1.5",
              "bg-destructive text-[11px] font-semibold text-destructive-foreground",
              "flex items-center justify-center ring-2 ring-background",
            )}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Large workspace panel */}
      <div
        data-testid="chat-panel"
        className={cn(
          "fixed z-50 overflow-hidden border border-border bg-background shadow-2xl",
          "transition-transform duration-300 ease-out",
          "right-0 bottom-0 md:bottom-5 md:right-5 md:rounded-lg",
          "flex flex-col",
          "h-[100dvh] w-full",
          "md:h-[min(760px,calc(100dvh-2.5rem))] md:w-[min(1120px,calc(100vw-2.5rem))]",
          open ? "translate-x-0" : "translate-x-[110%]",
        )}
        aria-hidden={!open}
      >
        <ChatWorkspace
          userId={user.id}
          activeConv={activeConv}
          onActiveConv={setActiveConv}
          onClose={() => setOpen(false)}
        />
      </div>
    </>
  );
}
