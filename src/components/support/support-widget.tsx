/**
 * Enterprise Support Widget — persistent floating bubble + chat sheet.
 * Mounted once inside AppShell so it survives navigation. Visible only to
 * users with `support.use` permission. Platform admins use the Support Inbox
 * page instead and the bubble is hidden when they're on that route.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send, Paperclip, Plus, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  listSupportConversations, getSupportConversation, createSupportConversation,
  postSupportMessage, markSupportRead, createSupportAttachmentUrl, getSupportUnreadCount,
} from "@/lib/support.functions";

type Priority = "low" | "normal" | "high" | "critical";
type Status = "open" | "pending" | "resolved" | "closed";

interface Conversation {
  id: string; company_id: string; subject: string;
  status: Status; priority: Priority;
  last_message_at: string; unread_for_customer: number; unread_for_platform: number;
  companies?: { name: string } | null;
}
interface Message {
  id: string; conversation_id: string; sender_id: string;
  sender_kind: "customer" | "platform"; body: string;
  internal_note: boolean; attachments: Array<{ path: string; name: string; size: number; mime: string }>;
  created_at: string;
}

const priorityColor: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  critical: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function gatherContext(routePath: string, auth: ReturnType<typeof useAuth>, viewingCompanyId: string | null) {
  if (typeof window === "undefined") return {};
  return {
    company_id: auth.companyId,
    company_name: auth.companyName,
    viewing_company_id: viewingCompanyId,
    route: routePath,
    role: auth.roles[0] ?? null,
    roles: auth.roles,
    user_email: auth.user?.email ?? null,
    browser: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    app_version: "OPSQAI",
    timestamp: new Date().toISOString(),
  };
}

export function SupportWidget() {
  const auth = useAuth();
  const navigate = useNavigate();
  const routeState = useRouterState({ select: (s) => s.location.pathname });
  const canUse = auth.hasPermission("support.use") || auth.hasPermission("support.manage");
  const isPlatform = auth.isPlatformAdmin;

  // Hide bubble when on the platform inbox itself, or when the user lacks permission.
  const onInbox = routeState.startsWith("/app/admin/support");
  const hidden = !canUse || onInbox || !auth.user;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "new" | "thread">("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ path: string; name: string; size: number; mime: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("normal");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const listFn = useServerFn(listSupportConversations);
  const getFn = useServerFn(getSupportConversation);
  const createFn = useServerFn(createSupportConversation);
  const postFn = useServerFn(postSupportMessage);
  const readFn = useServerFn(markSupportRead);
  const uploadUrlFn = useServerFn(createSupportAttachmentUrl);
  const unreadFn = useServerFn(getSupportUnreadCount);

  const refreshUnread = async () => {
    if (!canUse || !auth.user) return;
    try {
      const r = await unreadFn();
      setUnread(r.count ?? 0);
    } catch { /* noop */ }
  };

  // Poll + realtime unread badge.
  useEffect(() => {
    if (!canUse || !auth.user) return;
    refreshUnread();
    const t = setInterval(refreshUnread, 30000);
    const ch = supabase
      .channel("support-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, refreshUnread)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, refreshUnread)
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse, auth.user?.id]);

  const loadList = async () => {
    setLoading(true);
    try {
      const rows = await listFn({ data: { scope: isPlatform ? "platform" : "mine" } });
      setConversations(rows as unknown as Conversation[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  };

  const loadThread = async (id: string) => {
    setLoading(true); setError(null);
    try {
      const { conversation, messages } = await getFn({ data: { id } });
      if (conversation) {
        setMessages(messages as unknown as Message[]);
        setActiveId(id);
        setView("thread");
        await readFn({ data: { id } }).catch(() => {});
        refreshUnread();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (open && view === "list") loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view]);

  // Realtime updates for the active thread.
  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`support-thread-${activeId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as unknown as Message]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, view]);

  const handleAttach = async (files: FileList | null) => {
    if (!files || !activeId) return;
    const arr = Array.from(files).slice(0, 10 - attachments.length);
    setUploading(true);
    try {
      for (const file of arr) {
        if (file.size > 20 * 1024 * 1024) { setError(`${file.name} exceeds 20MB`); continue; }
        const signed = await uploadUrlFn({ data: { conversation_id: activeId, filename: file.name, mime: file.type || "application/octet-stream" } });
        const { error: upErr } = await supabase.storage.from("support-attachments")
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (upErr) { setError(upErr.message); continue; }
        setAttachments((prev) => [...prev, { path: signed.path, name: file.name, size: file.size, mime: file.type }]);
      }
    } finally { setUploading(false); }
  };

  const onPaste: React.ClipboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (!activeId) return;
    const files = Array.from(e.clipboardData.files);
    if (files.length) {
      e.preventDefault();
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleAttach(dt.files);
    }
  };

  const sendReply = async () => {
    if (!activeId || !draft.trim()) return;
    setError(null);
    try {
      await postFn({ data: {
        conversation_id: activeId, body: draft.trim(),
        internal_note: isPlatform ? internalNote : false,
        attachments,
        context: gatherContext(routeState, auth, auth.activeCompanyId),
      } });
      setDraft(""); setAttachments([]); setInternalNote(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    }
  };

  const createNew = async () => {
    if (!newSubject.trim() || !draft.trim()) return;
    setError(null); setLoading(true);
    try {
      const conv = await createFn({ data: {
        subject: newSubject.trim(), priority: newPriority, body: draft.trim(),
        attachments: [], context: gatherContext(routeState, auth, auth.activeCompanyId),
      } });
      setNewSubject(""); setDraft(""); setNewPriority("normal");
      await loadThread((conv as { id: string }).id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally { setLoading(false); }
  };

  if (hidden) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open support"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <Card className="fixed bottom-24 right-5 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            {view !== "list" && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setView("list"); setActiveId(null); setMessages([]); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold tracking-tight">
                {view === "new" ? "New support request" : view === "thread" ? "Conversation" : "Support"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {isPlatform ? "Platform inbox · widget view" : "We usually reply within a few hours"}
              </div>
            </div>
            {view === "list" && !isPlatform && (
              <Button size="sm" variant="outline" onClick={() => { setView("new"); setDraft(""); setNewSubject(""); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="px-4 py-2 text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />{error}
            </div>
          )}

          {view === "list" && (
            <div className="flex-1 overflow-y-auto">
              {loading && <div className="p-6 text-center text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />Loading…</div>}
              {!loading && conversations.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No conversations yet.
                  {!isPlatform && <Button size="sm" className="mt-3 block mx-auto" onClick={() => setView("new")}><Plus className="h-3.5 w-3.5 mr-1" /> Start a conversation</Button>}
                </div>
              )}
              <div className="divide-y divide-border">
                {conversations.map((c) => {
                  const u = isPlatform ? c.unread_for_platform : c.unread_for_customer;
                  return (
                    <button key={c.id} onClick={() => loadThread(c.id)} className="w-full text-left px-4 py-3 hover:bg-muted/60 transition">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={`text-[10px] capitalize ${priorityColor[c.priority]}`}>{c.priority}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
                        {isPlatform && c.companies?.name && <span className="text-[10px] text-muted-foreground truncate">{c.companies.name}</span>}
                        {u > 0 && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <div className="text-sm font-medium truncate">{c.subject}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(c.last_message_at).toLocaleString()}</div>
                    </button>
                  );
                })}
              </div>
              {isPlatform && (
                <div className="p-3 border-t border-border">
                  <Button size="sm" variant="outline" className="w-full" onClick={() => { setOpen(false); navigate({ to: "/app/admin/support" }); }}>
                    Open full inbox →
                  </Button>
                </div>
              )}
            </div>
          )}

          {view === "new" && (
            <div className="flex-1 flex flex-col p-4 gap-3">
              <Input placeholder="Subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Describe the issue or request…" rows={8} className="flex-1 resize-none" />
              <Button onClick={createNew} disabled={!newSubject.trim() || !draft.trim() || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" /> Send</>}
              </Button>
              <div className="text-[10px] text-muted-foreground">Page, browser and workspace context attach automatically.</div>
            </div>
          )}

          {view === "thread" && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/20">
                {messages.map((m) => {
                  const mine = m.sender_id === auth.user?.id;
                  const isInternal = m.internal_note;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isInternal ? "bg-amber-500/15 border border-amber-500/30" :
                        mine ? "bg-primary text-primary-foreground" : "bg-background border border-border"
                      }`}>
                        {isInternal && <div className="text-[10px] uppercase tracking-wider mb-1 opacity-70">Internal note</div>}
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        {m.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {m.attachments.map((a, i) => (
                              <a key={i} href="#" onClick={async (e) => {
                                e.preventDefault();
                                const { getSupportAttachmentUrl } = await import("@/lib/support.functions");
                                const { url } = await getSupportAttachmentUrl({ data: { path: a.path } });
                                window.open(url, "_blank");
                              }} className="block text-[11px] underline opacity-90">
                                📎 {a.name}
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && !loading && (
                  <div className="text-center text-xs text-muted-foreground py-8">No messages.</div>
                )}
              </div>

              <div className="p-3 border-t border-border space-y-2">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {attachments.map((a, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {a.name}
                        <button className="ml-1.5 opacity-60 hover:opacity-100" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}>×</button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onPaste={onPaste}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
                  placeholder={isPlatform && internalNote ? "Internal note (not visible to customer)" : "Type a message… (⌘↵ to send)"}
                  rows={3}
                  className="resize-none text-sm"
                />
                <div className="flex items-center gap-1">
                  <label className="cursor-pointer">
                    <input type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => handleAttach(e.target.files)} />
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8"><span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}</span></Button>
                  </label>
                  {isPlatform && (
                    <button onClick={() => setInternalNote((v) => !v)} className={`text-[10px] px-2 py-1 rounded ${internalNote ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted"}`}>
                      Internal
                    </button>
                  )}
                  <Button onClick={sendReply} disabled={!draft.trim()} className="ml-auto" size="sm">
                    <Send className="h-3.5 w-3.5 mr-1" /> Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}
