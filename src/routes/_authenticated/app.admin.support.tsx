/**
 * Enterprise Support Inbox — Platform Owner / Platform Admin only.
 * Centralised view of every support conversation across all companies.
 */
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listSupportConversations,
  getSupportConversation,
  postSupportMessage,
  updateSupportConversation,
  markSupportRead,
  createSupportAttachmentUrl,
  getSupportAttachmentUrl,
} from "@/lib/support.functions";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink,
  Send,
  Paperclip,
  Loader2,
  MessageCircle,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/admin/support")({
  head: () => ({ meta: [{ title: "Support Inbox — OPSQAI" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { c?: string; company?: string; status?: string; priority?: string } => {
    const out: { c?: string; company?: string; status?: string; priority?: string } = {};
    if (typeof s.c === "string") out.c = s.c;
    if (typeof s.company === "string") out.company = s.company;
    if (typeof s.status === "string") out.status = s.status;
    if (typeof s.priority === "string") out.priority = s.priority;
    return out;
  },
  component: Page,
});

type Priority = "low" | "normal" | "high" | "critical";
type Status = "open" | "pending" | "resolved" | "closed";
interface Conv {
  id: string;
  company_id: string;
  subject: string;
  status: Status;
  priority: Priority;
  assigned_to: string | null;
  opened_by: string;
  last_message_at: string;
  unread_for_platform: number;
  unread_for_customer: number;
  companies?: { name: string } | null;
  context?: Record<string, unknown> | null;
}
interface Msg {
  id: string;
  sender_id: string;
  sender_kind: "customer" | "platform";
  body: string;
  internal_note: boolean;
  attachments: Array<{ path: string; name: string; size: number; mime: string }>;
  created_at: string;
}

const priorityColor: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  critical: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function Page() {
  const auth = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/app/admin/support" });

  const listFn = useServerFn(listSupportConversations);
  const getFn = useServerFn(getSupportConversation);
  const postFn = useServerFn(postSupportMessage);
  const updateFn = useServerFn(updateSupportConversation);
  const readFn = useServerFn(markSupportRead);
  const uploadUrlFn = useServerFn(createSupportAttachmentUrl);
  const attUrlFn = useServerFn(getSupportAttachmentUrl);

  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{ path: string; name: string; size: number; mime: string }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(search.status ?? "all");
  const [priorityFilter, setPriorityFilter] = useState<string>(search.priority ?? "all");
  const [companyFilter, setCompanyFilter] = useState<string>(search.company ?? "all");
  const [searchText, setSearchText] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listFn({
        data: {
          scope: "platform",
          status: statusFilter !== "all" ? (statusFilter as Status) : undefined,
          priority: priorityFilter !== "all" ? (priorityFilter as Priority) : undefined,
          company_id: companyFilter !== "all" ? companyFilter : undefined,
          search: searchText || undefined,
        },
      });
      setConvs(rows as unknown as Conv[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [statusFilter, priorityFilter, companyFilter]);

  const openConv = async (c: Conv) => {
    setActive(c);
    setMessages([]);
    setError(null);
    try {
      const { conversation, messages } = await getFn({ data: { id: c.id } });
      if (conversation) setActive(conversation as unknown as Conv);
      setMessages(messages as unknown as Msg[]);
      await readFn({ data: { id: c.id } }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  // Deep link via ?c=<id>
  useEffect(() => {
    if (search.c) {
      const c = convs.find((x) => x.id === search.c);
      if (c) openConv(c);
    }
    // eslint-disable-next-line
  }, [search.c, convs.length]);

  // Realtime for active thread.
  useEffect(() => {
    if (!active) return;
    const ch = supabase
      .channel(`support-inbox-${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${active.id}`,
        },
        (p) => setMessages((prev) => [...prev, p.new as unknown as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [active?.id]);

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    convs.forEach((c) => {
      if (c.companies?.name) map.set(c.company_id, c.companies.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [convs]);

  const handleAttach = async (files: FileList | null) => {
    if (!files || !active) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10 - attachments.length)) {
        if (file.size > 20 * 1024 * 1024) {
          setError(`${file.name} > 20MB`);
          continue;
        }
        const signed = await uploadUrlFn({
          data: {
            conversation_id: active.id,
            filename: file.name,
            mime: file.type || "application/octet-stream",
          },
        });
        const { error: e } = await supabase.storage
          .from("support-attachments")
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (e) {
          setError(e.message);
          continue;
        }
        setAttachments((p) => [
          ...p,
          { path: signed.path, name: file.name, size: file.size, mime: file.type },
        ]);
      }
    } finally {
      setUploading(false);
    }
  };

  const send = async () => {
    if (!active || !draft.trim()) return;
    try {
      await postFn({
        data: {
          conversation_id: active.id,
          body: draft.trim(),
          internal_note: internal,
          attachments,
          context: {},
        },
      });
      setDraft("");
      setAttachments([]);
      setInternal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const setStatus = async (s: Status) => {
    if (!active) return;
    await updateFn({ data: { id: active.id, status: s } });
    setActive({ ...active, status: s });
    load();
  };
  const setPriority = async (p: Priority) => {
    if (!active) return;
    await updateFn({ data: { id: active.id, priority: p } });
    setActive({ ...active, priority: p });
    load();
  };
  const assignSelf = async () => {
    if (!active || !auth.user) return;
    await updateFn({ data: { id: active.id, assigned_to: auth.user.id } });
    setActive({ ...active, assigned_to: auth.user.id });
    load();
  };

  const openWorkspace = () => {
    if (!active) return;
    auth.setActiveCompanyId(active.company_id);
    navigate({ to: "/app" });
  };

  if (!auth.isPlatformAdmin) {
    return <div className="p-8 text-sm text-muted-foreground">Platform admins only.</div>;
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
      <div className="mb-6 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every customer support conversation across the platform.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4">
        <Card className="flex flex-col overflow-hidden h-[calc(100vh-220px)]">
          <div className="p-3 space-y-2 border-b border-border">
            <Input
              placeholder="Search subject…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {companies.length > 0 && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All companies</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            )}
            {!loading && convs.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">No conversations.</div>
            )}
            {convs.map((c) => (
              <button
                key={c.id}
                onClick={() => openConv(c)}
                className={`w-full text-left p-3 hover:bg-muted/60 transition ${active?.id === c.id ? "bg-muted/60" : ""}`}
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Badge className={`text-[10px] capitalize ${priorityColor[c.priority]}`}>
                    {c.priority}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {c.status}
                  </Badge>
                  {c.unread_for_platform > 0 && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="text-sm font-medium truncate">{c.subject}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {c.companies?.name ?? "—"} · {new Date(c.last_message_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden h-[calc(100vh-220px)]">
          {!active && (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Select a conversation
              </div>
            </div>
          )}
          {active && (
            <>
              <div className="p-4 border-b border-border space-y-2">
                <div className="flex items-start gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 lg:hidden"
                    onClick={() => setActive(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{active.subject}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {active.companies?.name} · opened{" "}
                      {new Date(active.last_message_at).toLocaleString()}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={openWorkspace}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open workspace
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Select value={active.status} onValueChange={(v) => setStatus(v as Status)}>
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={active.priority} onValueChange={(v) => setPriority(v as Priority)}>
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  {active.assigned_to !== auth.user?.id && (
                    <Button variant="ghost" size="sm" onClick={assignSelf} className="h-7 text-xs">
                      Assign to me
                    </Button>
                  )}
                  {active.assigned_to === auth.user?.id && (
                    <Badge variant="secondary" className="text-[10px]">
                      Assigned to you
                    </Badge>
                  )}
                </div>
                {active.context && Object.keys(active.context).length > 0 && (
                  <details className="text-[11px]">
                    <summary className="cursor-pointer text-muted-foreground">
                      Customer context
                    </summary>
                    <pre className="mt-1 bg-muted rounded p-2 overflow-auto max-h-32">
                      {JSON.stringify(active.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              {error && (
                <div className="px-4 py-2 text-xs bg-red-500/10 text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  {error}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
                {messages.map((m) => {
                  const mine = m.sender_id === auth.user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          m.internal_note
                            ? "bg-amber-500/15 border border-amber-500/30"
                            : m.sender_kind === "platform"
                              ? mine
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary/10"
                              : "bg-background border border-border"
                        }`}
                      >
                        {m.internal_note && (
                          <div className="text-[10px] uppercase tracking-wider mb-1 opacity-70">
                            Internal note
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        {m.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {m.attachments.map((a, i) => (
                              <a
                                key={i}
                                href="#"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  const { url } = await attUrlFn({ data: { path: a.path } });
                                  window.open(url, "_blank");
                                }}
                                className="block text-[11px] underline opacity-90"
                              >
                                📎 {a.name}
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="text-[10px] opacity-60 mt-1">
                          {new Date(m.created_at).toLocaleTimeString()} · {m.sender_kind}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-border space-y-2">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {attachments.map((a, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {a.name}
                        <button
                          className="ml-1.5 opacity-60"
                          onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                  }}
                  rows={3}
                  placeholder={
                    internal
                      ? "Internal note (hidden from customer)"
                      : "Reply to customer… (⌘↵ to send)"
                  }
                  className="resize-none text-sm"
                />
                <div className="flex items-center gap-1">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => handleAttach(e.target.files)}
                    />
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </span>
                    </Button>
                  </label>
                  <button
                    onClick={() => setInternal((v) => !v)}
                    className={`text-[10px] px-2 py-1 rounded ${internal ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    Internal note
                  </button>
                  <Button onClick={send} disabled={!draft.trim()} className="ml-auto" size="sm">
                    <Send className="h-3.5 w-3.5 mr-1" /> Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
