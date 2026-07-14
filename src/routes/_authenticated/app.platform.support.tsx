import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Send, Filter, MoreVertical, Check, CheckCheck, Plus, Loader2, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/platform/support")({
  head: () => ({ meta: [{ title: "Support Inbox — Mission Control" }] }),
  component: SupportInbox,
});

type ConvStatus = "open" | "pending" | "resolved" | "closed";
type ConvPriority = "low" | "normal" | "high" | "urgent";

interface Conversation {
  id: string;
  company_id: string;
  subject: string;
  status: ConvStatus;
  priority: ConvPriority;
  last_message_at: string | null;
  unread_for_platform: number;
  created_at: string;
  company?: { name: string | null } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_kind: "customer" | "platform" | "system";
  body: string;
  internal_note: boolean;
  created_at: string;
}

interface Company {
  id: string;
  name: string | null;
}

const FILTERS = ["All", "Open", "Pending", "Resolved"] as const;
type FilterKey = (typeof FILTERS)[number];

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "acum";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}z`;
  return new Date(iso).toLocaleDateString();
}

function initialsFrom(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function colorFor(id: string): string {
  const palette = ["#7c5cff", "#22d3ee", "#ec4899", "#f59e0b", "#10b981", "#a78bfa"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function SupportInbox() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("All");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function loadConversations() {
    setLoadingConvs(true);
    const { data, error } = await supabase
      .from("support_conversations")
      .select("id, company_id, subject, status, priority, last_message_at, unread_for_platform, created_at, company:companies(name)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200);
    setLoadingConvs(false);
    if (error) {
      toast.error("Nu am putut încărca conversațiile");
      return;
    }
    const list = (data ?? []) as unknown as Conversation[];
    setConvs(list);
    setActive((cur) => cur ?? list[0] ?? null);
  }

  async function loadCompanies() {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    setCompanies((data ?? []) as Company[]);
  }

  useEffect(() => {
    loadConversations();
    loadCompanies();
  }, []);

  useEffect(() => {
    if (!active) {
      setMessages([]);
      return;
    }
    setLoadingMsgs(true);
    supabase
      .from("support_messages")
      .select("id, conversation_id, sender_id, sender_kind, body, internal_note, created_at")
      .eq("conversation_id", active.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        setLoadingMsgs(false);
        if (error) {
          toast.error("Nu am putut încărca mesajele");
          return;
        }
        setMessages((data ?? []) as Message[]);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        });
      });
  }, [active?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return convs.filter((c) => {
      if (filter === "Open" && c.status !== "open") return false;
      if (filter === "Pending" && c.status !== "pending") return false;
      if (filter === "Resolved" && c.status !== "resolved" && c.status !== "closed") return false;
      if (q) {
        const hay = `${c.subject ?? ""} ${c.company?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [convs, filter, search]);

  async function sendMessage() {
    if (!active || !draft.trim() || !userId) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    const { error } = await supabase.from("support_messages").insert({
      conversation_id: active.id,
      sender_id: userId,
      sender_kind: "platform",
      body,
      internal_note: false,
    });
    if (error) {
      toast.error("Trimiterea a eșuat");
      setDraft(body);
      setSending(false);
      return;
    }
    await supabase
      .from("support_conversations")
      .update({ last_message_at: new Date().toISOString(), status: "open" })
      .eq("id", active.id);
    setSending(false);
    // reload thread + list
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("id, conversation_id, sender_id, sender_kind, body, internal_note, created_at")
      .eq("conversation_id", active.id)
      .order("created_at", { ascending: true });
    setMessages((msgs ?? []) as Message[]);
    loadConversations();
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  const totalUnread = convs.reduce((a, c) => a + (c.unread_for_platform ?? 0), 0);

  return (
    <div className="h-[calc(100vh-140px)] flex overflow-hidden rounded-xl border border-white/5 bg-[var(--mc-surface)] m-4">
      {/* Left: conv list */}
      <aside className="w-[340px] shrink-0 border-r border-white/5 flex flex-col bg-[var(--mc-surface-2)]">
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="mc-heading font-semibold text-[var(--mc-fg)]">Inbox</h2>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <span className="mc-num text-xs px-2 py-0.5 rounded-full bg-[var(--mc-gold)]/15 text-[var(--mc-gold-glow)]">
                  {totalUnread}
                </span>
              )}
              <Button
                size="sm"
                className="h-7 gap-1 bg-[var(--mc-gold)] hover:bg-[var(--mc-gold-glow)] text-black text-[11px] px-2"
                onClick={() => setOpenNew(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Nouă
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--mc-fg-dim)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută conversații…"
              className="pl-8 h-9 bg-[var(--mc-surface-3)] border-white/5 text-sm"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                  filter === f
                    ? "bg-[var(--mc-gold)]/15 border-[var(--mc-gold)]/40 text-[var(--mc-gold-glow)]"
                    : "border-white/5 text-[var(--mc-fg-muted)] hover:text-[var(--mc-fg)]",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-6 flex items-center justify-center text-[var(--mc-fg-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--mc-fg-muted)]">
              <Inbox className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <div>Nicio conversație{convs.length === 0 ? "" : " care să corespundă filtrelor"}</div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-8 border-white/10 text-xs"
                onClick={() => setOpenNew(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Deschide una nouă
              </Button>
            </div>
          ) : (
            filtered.map((c) => {
              const initials = initialsFrom(c.company?.name);
              const color = colorFor(c.company_id);
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 border-b border-white/5 text-left transition-colors",
                    active?.id === c.id ? "bg-[var(--mc-gold)]/8" : "hover:bg-white/[0.02]",
                  )}
                >
                  <div className="relative shrink-0">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm text-white"
                      style={{ background: color }}
                    >
                      {initials}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-medium text-sm text-[var(--mc-fg)] truncate">
                        {c.company?.name ?? "—"}
                      </div>
                      <div className="text-[10px] text-[var(--mc-fg-dim)] shrink-0">
                        {timeAgo(c.last_message_at ?? c.created_at)}
                      </div>
                    </div>
                    <div className="text-[11px] text-[var(--mc-fg-muted)] truncate">
                      {c.subject || "(fără subiect)"}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-[9px] uppercase tracking-wider px-1.5 py-0 rounded",
                            c.status === "open" && "bg-[var(--mc-success)]/15 text-[var(--mc-success)]",
                            c.status === "pending" && "bg-[var(--mc-gold)]/15 text-[var(--mc-gold-glow)]",
                            (c.status === "resolved" || c.status === "closed") && "bg-white/5 text-[var(--mc-fg-dim)]",
                          )}
                        >
                          {c.status}
                        </span>
                        {c.priority === "high" || c.priority === "urgent" ? (
                          <span className="text-[9px] uppercase px-1.5 rounded bg-[var(--mc-danger)]/15 text-[var(--mc-danger)]">
                            {c.priority}
                          </span>
                        ) : null}
                      </div>
                      {(c.unread_for_platform ?? 0) > 0 && (
                        <div className="shrink-0 h-5 min-w-[20px] rounded-full bg-[var(--mc-gold)] text-black text-[10px] font-bold flex items-center justify-center px-1.5">
                          {c.unread_for_platform}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Center: thread */}
      <main className="flex-1 flex flex-col min-w-0">
        {active ? (
          <>
            <header className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm text-white shrink-0"
                  style={{ background: colorFor(active.company_id) }}
                >
                  {initialsFrom(active.company?.name)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-[var(--mc-fg)] truncate">
                    {active.company?.name ?? "—"}
                  </div>
                  <div className="text-[11px] text-[var(--mc-fg-muted)] truncate">
                    {active.subject || "(fără subiect)"} · {active.status}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </header>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-[var(--mc-bg)]/40"
            >
              {loadingMsgs ? (
                <div className="flex justify-center py-8 text-[var(--mc-fg-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-sm text-[var(--mc-fg-muted)] py-10">
                  Niciun mesaj încă. Scrie primul răspuns mai jos.
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_kind === "platform";
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2 text-sm relative",
                          mine
                            ? "bg-[var(--mc-gold)] text-black rounded-br-md"
                            : "bg-[var(--mc-surface-3)] text-[var(--mc-fg)] rounded-bl-md border border-white/5",
                          m.internal_note && "!bg-[var(--mc-gold)]/20 !text-[var(--mc-gold-glow)] border border-[var(--mc-gold)]/40",
                        )}
                      >
                        {m.internal_note && (
                          <div className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5">
                            Notă internă
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        <div
                          className={cn(
                            "text-[10px] mt-1 flex items-center gap-1 justify-end",
                            mine ? "text-black/60" : "text-[var(--mc-fg-dim)]",
                          )}
                        >
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {mine && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="shrink-0 border-t border-white/5 px-4 py-3 flex items-center gap-2 bg-[var(--mc-surface-2)]">
              <Input
                placeholder="Scrie un răspuns…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={sending}
                className="flex-1 bg-[var(--mc-surface-3)] border-white/5"
              />
              <Button
                className="bg-[var(--mc-gold)] hover:bg-[var(--mc-gold-glow)] text-black"
                size="icon"
                disabled={!draft.trim() || sending}
                onClick={sendMessage}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--mc-fg-muted)]">
            <div className="text-center">
              <Inbox className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <div className="text-sm">Selectează o conversație sau deschide una nouă</div>
              <Button
                className="mt-4 bg-[var(--mc-gold)] hover:bg-[var(--mc-gold-glow)] text-black"
                onClick={() => setOpenNew(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Conversație nouă
              </Button>
            </div>
          </div>
        )}
      </main>

      <NewConversationDialog
        open={openNew}
        onOpenChange={setOpenNew}
        companies={companies}
        userId={userId}
        onCreated={async (id) => {
          await loadConversations();
          const { data } = await supabase
            .from("support_conversations")
            .select("id, company_id, subject, status, priority, last_message_at, unread_for_platform, created_at, company:companies(name)")
            .eq("id", id)
            .maybeSingle();
          if (data) setActive(data as unknown as Conversation);
        }}
      />
    </div>
  );
}

function NewConversationDialog({
  open,
  onOpenChange,
  companies,
  userId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companies: Company[];
  userId: string | null;
  onCreated: (id: string) => void;
}) {
  const [companyId, setCompanyId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<ConvPriority>("normal");
  const [firstMessage, setFirstMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCompanyId("");
      setSubject("");
      setPriority("normal");
      setFirstMessage("");
    }
  }, [open]);

  async function submit() {
    if (!companyId || !subject.trim() || !userId) {
      toast.error("Alege firma și completează subiectul");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("support_conversations")
      .insert({
        company_id: companyId,
        opened_by: userId,
        subject: subject.trim(),
        status: "open",
        priority,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error || !data) {
      setBusy(false);
      toast.error(error?.message || "Nu am putut crea conversația");
      return;
    }
    if (firstMessage.trim()) {
      await supabase.from("support_messages").insert({
        conversation_id: data.id,
        sender_id: userId,
        sender_kind: "platform",
        body: firstMessage.trim(),
        internal_note: false,
      });
    }
    setBusy(false);
    toast.success("Conversație creată");
    onOpenChange(false);
    onCreated(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conversație nouă</DialogTitle>
          <DialogDescription>Deschide un tichet pentru o firmă client.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Firmă</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Alege firma…" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name ?? c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Subiect</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: eroare la import ANAF" />
          </div>
          <div>
            <Label className="text-xs">Prioritate</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ConvPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Scăzută</SelectItem>
                <SelectItem value="normal">Normală</SelectItem>
                <SelectItem value="high">Ridicată</SelectItem>
                <SelectItem value="urgent">Urgentă</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Primul mesaj (opțional)</Label>
            <Textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              rows={3}
              placeholder="Scrie o notă de deschidere…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Anulează
          </Button>
          <Button
            className="bg-[var(--mc-gold)] hover:bg-[var(--mc-gold-glow)] text-black"
            onClick={submit}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creează"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
