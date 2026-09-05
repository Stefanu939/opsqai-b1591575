import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  FileWarning,
  GraduationCap,
  Info,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cloudFeaturesEnabled, getCloudBrowserDb } from "@/lib/cloud-client";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Notif {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** Kind -> icon. Unknown kinds fall back to a neutral info icon. */
function kindIcon(kind: string) {
  if (kind.startsWith("academy.")) return GraduationCap;
  if (kind.includes("critical") || kind.includes("audit")) return ShieldAlert;
  if (kind.includes("outdated") || kind.includes("gap") || kind.includes("confidence"))
    return FileWarning;
  return Info;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [busy, setBusy] = useState(false);
  // `notifications` is a Cloud table. Self-Hosted has no notification
  // inbox yet, so the bell is simply not rendered there.
  const enabled = cloudFeaturesEnabled();
  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) return;
    const db = await getCloudBrowserDb();
    if (!db) return;
    // Platform admins can read every row through RLS, so the recipient
    // filter is mandatory: without it the bell shows other people's
    // notifications, which can never be marked read or dismissed.
    const { data } = await db
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as Notif[]);
  }, [userId]);

  useEffect(() => {
    if (!userId || !enabled) return;
    let cancelled = false;
    let channel: { unsubscribe: () => void } | null = null;
    void load();
    const timer = setInterval(() => void load(), 60000);
    void (async () => {
      const db = await getCloudBrowserDb();
      if (!db || cancelled) return;
      channel = db
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => void load(),
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      clearInterval(timer);
      channel?.unsubscribe();
    };
  }, [userId, enabled, load]);

  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items]);
  const visible = tab === "unread" ? items.filter((n) => !n.read_at) : items;

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    const db = await getCloudBrowserDb();
    if (!db) return;
    await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as never)
      .eq("id", id);
    void load();
  };

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length || busy) return;
    setBusy(true);
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    const db = await getCloudBrowserDb();
    if (db) {
      await db
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as never)
        .in("id", ids);
    }
    setBusy(false);
    void load();
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    const db = await getCloudBrowserDb();
    if (!db) return;
    await db.from("notifications").delete().eq("id", id);
    void load();
  };

  const open = (n: Notif) => {
    if (!n.read_at) void markRead(n.id);
    if (!n.link) return;
    if (/^https?:\/\//i.test(n.link)) {
      window.open(n.link, "_blank", "noopener,noreferrer");
      return;
    }
    // A stale link must never crash the shell.
    try {
      void navigate({ href: n.link });
    } catch {
      window.location.assign(n.link);
    }
  };

  if (!enabled) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md"
          aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        >
          {unread > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-88 max-h-[70vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={markAllRead}
              disabled={busy}
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 px-2 py-1.5 border-b">
          {(["unread", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-2 py-1 text-xs capitalize ${
                tab === t
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "unread" ? `Unread${unread ? ` (${unread})` : ""}` : "All"}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {tab === "unread" ? "You are all caught up." : "No notifications yet."}
          </div>
        ) : (
          <div>
            {visible.map((n) => {
              const Icon = kindIcon(n.kind);
              return (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 border-b last:border-0 text-xs hover:bg-muted/40 ${n.read_at ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <button className="flex-1 min-w-0 text-left" onClick={() => open(n)}>
                      <div className="font-medium truncate">{n.title}</div>
                      {n.body && (
                        <div className="text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {relativeTime(n.created_at)}
                      </div>
                    </button>
                    <div className="flex flex-col gap-0.5">
                      {!n.read_at && (
                        <button
                          aria-label="Mark read"
                          onClick={() => markRead(n.id)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        aria-label="Dismiss"
                        onClick={() => remove(n.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
