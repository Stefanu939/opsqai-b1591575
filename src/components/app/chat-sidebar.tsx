import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listThreads,
  deleteThread,
  renameThread,
  createThread,
  setThreadPinned,
} from "@/lib/threads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquarePlus, Search, Trash2, Pencil, Check, X, MessagesSquare, Pin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { toast } from "sonner";
import { confirmAction } from "@/components/ui/confirm";

type Thread = { id: string; title: string; created_at: string; updated_at: string; pinned: boolean };

function bucketOf(iso: string): "today" | "week" | "month" | "older" {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (now - d < day) return "today";
  if (now - d < 7 * day) return "week";
  if (now - d < 30 * day) return "month";
  return "older";
}

export function ChatSidebar() {
  const navigate = useNavigate();
  const { scopeCompanyId } = useAuth();
  const { lang } = useT();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const remove = useServerFn(deleteThread);
  const rename = useServerFn(renameThread);
  const togglePinServer = useServerFn(setThreadPinned);
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const rows = await list({ data: { companyId: scopeCompanyId ?? undefined } });
      setThreads(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
          pinned: r.pinned === true,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [scopeCompanyId, activeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? threads.filter((t) => (t.title || "").toLowerCase().includes(q)) : threads;
  }, [threads, query]);

  // Pinned conversations are stored on the server, per user, so they follow
  // the user across devices. The local copy is optimistic UI state.
  const togglePin = async (id: string) => {
    const current = threads.find((t) => t.id === id);
    const next = !(current?.pinned === true);
    setThreads((p) => p.map((t) => (t.id === id ? { ...t, pinned: next } : t)));
    try {
      await togglePinServer({ data: { id, pinned: next } });
    } catch (e) {
      setThreads((p) => p.map((t) => (t.id === id ? { ...t, pinned: !next } : t)));
      toast.error(String(e));
    }
  };

  const grouped = useMemo(() => {
    const g: Record<"pinned" | "today" | "week" | "month" | "older", Thread[]> = {
      pinned: [],
      today: [],
      week: [],
      month: [],
      older: [],
    };
    for (const t of filtered)
      g[t.pinned ? "pinned" : bucketOf(t.updated_at || t.created_at)].push(t);
    return g;
  }, [filtered]);
  const { lang: pinLang } = useT();
  const pinnedLabel = pinLang === "de" ? "Angeheftet" : pinLang === "en" ? "Pinned" : "Fixate";

  const onNew = async () => {
    try {
      const title = lang === "de" ? "Neue Unterhaltung" : lang === "ro" ? "Conversație nouă" : "New conversation";
      const th = await create({ data: { companyId: scopeCompanyId ?? undefined, title } });
      await reload();
      navigate({ to: "/app/chat/$threadId", params: { threadId: th.id } });
    } catch (e) {
      toast.error(String(e));
    }
  };

  const onDelete = async (id: string) => {
    if (
      !(await confirmAction({
        title:
          lang === "de" ? "Diese Unterhaltung löschen?" : lang === "ro" ? "Ștergi această conversație?" : "Delete this conversation?",
        confirmLabel: lang === "de" ? "Löschen" : lang === "ro" ? "Șterge" : "Delete",
        cancelLabel: lang === "de" ? "Abbrechen" : lang === "ro" ? "Anulează" : "Cancel",
      }))
    )
      return;
    try {
      await remove({ data: { id } });
      setThreads((p) => p.filter((t) => t.id !== id));
      if (activeId === id) navigate({ to: "/app/chat" });
    } catch (e) {
      toast.error(String(e));
    }
  };

  const startRename = (t: Thread) => {
    setEditingId(t.id);
    setDraft(t.title);
  };
  const commitRename = async () => {
    if (!editingId) return;
    const title = draft.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    try {
      await rename({ data: { id: editingId, title } });
      setThreads((p) => p.map((t) => (t.id === editingId ? { ...t, title } : t)));
    } catch (e) {
      toast.error(String(e));
    }
    setEditingId(null);
  };

  const labels = {
    today: lang === "de" ? "Heute" : lang === "ro" ? "Astăzi" : "Today",
    week: lang === "de" ? "Diese Woche" : lang === "ro" ? "Săptămâna aceasta" : "This week",
    month: lang === "de" ? "Diesen Monat" : lang === "ro" ? "Luna aceasta" : "This month",
    older: lang === "de" ? "Älter" : lang === "ro" ? "Mai vechi" : "Older",
    search:
      lang === "de"
        ? "Unterhaltungen suchen…"
        : lang === "ro"
          ? "Caută în conversații…"
          : "Search conversations…",
    newChat: lang === "de" ? "Neue Unterhaltung" : lang === "ro" ? "Conversație nouă" : "New chat",
    empty:
      lang === "de"
        ? "Noch keine Unterhaltungen"
        : lang === "ro"
          ? "Nicio conversație încă"
          : "No conversations yet",
    history: lang === "de" ? "Verlauf" : lang === "ro" ? "Istoric" : "History",
  };

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="p-3 border-b border-border space-y-2">
        <Button onClick={onNew} className="w-full justify-start gap-2 h-9" variant="secondary">
          <MessageSquarePlus className="h-4 w-4" /> {labels.newChat}
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
          <MessagesSquare className="h-3 w-3" /> {labels.history}
        </div>
        {loading ? (
          <div className="px-3 py-6 text-xs text-muted-foreground">…</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-xs text-muted-foreground">{labels.empty}</div>
        ) : (
          (["pinned", "today", "week", "month", "older"] as const).map((k) =>
            grouped[k].length ? (
              <div key={k} className="mb-3">
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {k === "pinned" ? pinnedLabel : labels[k]}
                </div>
                <div className="space-y-0.5">
                  {grouped[k].map((t) => {
                    const isActive = t.id === activeId;
                    const isEditing = editingId === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`group relative flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                          isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                        }`}
                      >
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-gold"
                          />
                        )}

                        {isEditing ? (
                          <>
                            <Input
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename();
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              autoFocus
                              className="h-7 text-xs"
                            />
                            <button
                              onClick={commitRename}
                              className="p-1 text-primary hover:bg-primary/10 rounded"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-muted-foreground hover:bg-muted rounded"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/app/chat/$threadId"
                              params={{ threadId: t.id }}
                              className="flex-1 min-w-0 truncate"
                              title={t.title}
                            >
                              {t.title === "New conversation"
                                ? labels.newChat
                                : t.title || (lang === "de" ? "Ohne Titel" : lang === "ro" ? "Fără titlu" : "Untitled")}
                            </Link>
                            <button
                              onClick={() => togglePin(t.id)}
                              className={`${t.pinned ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-100 text-muted-foreground"} p-1 hover:text-foreground hover:bg-muted rounded transition-opacity`}
                              aria-label="Pin"
                            >
                              <Pin className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => startRename(t)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-opacity"
                              aria-label="Rename"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => onDelete(t.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-opacity"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )
        )}
      </div>
    </aside>
  );
}
