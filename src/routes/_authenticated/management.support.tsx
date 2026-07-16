import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listSupportConversations,
  getSupportConversation,
  postSupportMessage,
  markSupportRead,
  updateSupportConversation,
} from "@/lib/support.functions";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Inbox, MessagesSquare, Search, Send, StickyNote } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/management/support")({
  head: () => ({ meta: [{ title: "Support — Management Center" }] }),
  component: SupportPage,
});

type Row = {
  id: string;
  company_id: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  last_message_at: string;
  created_at: string;
  unread_for_platform: number;
  companies: { name: string } | null;
};

function relTime(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function SupportPage() {
  const listFn = useServerFn(listSupportConversations);
  const getFn = useServerFn(getSupportConversation);
  const postFn = useServerFn(postSupportMessage);
  const readFn = useServerFn(markSupportRead);
  const updateFn = useServerFn(updateSupportConversation);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Row["status"]>("open");
  const [priority, setPriority] = useState<"all" | Row["priority"]>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-support", status, priority, q],
    queryFn: () =>
      listFn({
        data: {
          scope: "platform",
          status: status === "all" ? undefined : status,
          priority: priority === "all" ? undefined : priority,
          search: q || undefined,
        },
      }) as Promise<Row[]>,
  });

  const conv = useQuery({
    queryKey: ["mc-support-conv", selected],
    queryFn: () => getFn({ data: { id: selected! } }),
    enabled: !!selected,
    refetchInterval: 15000,
  });

  const send = useMutation({
    mutationFn: () =>
      postFn({
        data: { conversation_id: selected!, body: reply, internal_note: internal },
      }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["mc-support-conv", selected] });
      qc.invalidateQueries({ queryKey: ["mc-support", status, priority, q] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: (newStatus: Row["status"]) =>
      updateFn({ data: { id: selected!, status: newStatus } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mc-support-conv", selected] });
      qc.invalidateQueries({ queryKey: ["mc-support", status, priority, q] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!selected) return;
    readFn({ data: { id: selected } })
      .then(() => qc.invalidateQueries({ queryKey: ["mc-support", status, priority, q] }))
      .catch(() => {});
  }, [selected, readFn, qc, status, priority, q]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conv.data?.messages?.length]);

  const rows = data as Row[];
  const unread = useMemo(
    () => rows.reduce((sum, r) => sum + (r.unread_for_platform ?? 0), 0),
    [rows],
  );

  const activeConv = conv.data?.conversation;
  const messages = conv.data?.messages ?? [];

  const listPane = (
    <Card className="flex flex-col p-0 overflow-hidden h-full">
      <div className="border-b border-border p-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations…"
            className="h-9 pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {rows.length} conversation{rows.length === 1 ? "" : "s"} · {unread} unread
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-2 text-sm font-medium">No conversations</div>
            <div className="text-xs text-muted-foreground">
              Support tickets from customers will appear here.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const isActive = selected === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.id)}
                    className={`w-full text-left p-3 hover:bg-accent/40 transition-colors ${
                      isActive ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                        {initials(r.companies?.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm truncate">
                            {r.companies?.name ?? "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground shrink-0">
                            {relTime(r.last_message_at ?? r.created_at)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {r.subject}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge
                            variant={
                              r.status === "open"
                                ? "default"
                                : r.status === "pending"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[9px] h-4 px-1.5"
                          >
                            {r.status}
                          </Badge>
                          <Badge
                            variant={
                              r.priority === "critical"
                                ? "destructive"
                                : r.priority === "high"
                                  ? "default"
                                  : "outline"
                            }
                            className="text-[9px] h-4 px-1.5"
                          >
                            {r.priority}
                          </Badge>
                          {r.unread_for_platform > 0 && (
                            <Badge className="ml-auto text-[9px] h-4 px-1.5">
                              {r.unread_for_platform}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );

  const conversationPane = (
    <Card className="flex flex-col p-0 overflow-hidden h-full">
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <MessagesSquare className="h-10 w-10 text-muted-foreground" />
          <div className="mt-3 font-medium">Select a conversation</div>
          <div className="text-sm text-muted-foreground max-w-xs mt-1">
            Pick a ticket from the list to read the thread and reply to the customer.
          </div>
        </div>
      ) : conv.isLoading || !activeConv ? (
        <div className="p-6 text-sm text-muted-foreground">Loading conversation…</div>
      ) : (
        <>
          <div className="border-b border-border p-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-9 w-9 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
              {initials(activeConv.companies?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">
                {activeConv.companies?.name ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {activeConv.subject}
              </div>
            </div>
            <Select
              value={activeConv.status}
              onValueChange={(v) => updateStatus.mutate(v as Row["status"])}
            >
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20"
          >
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No messages yet.
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.sender_kind === "platform";
                if (m.internal_note) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[85%] rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
                        <div className="flex items-center gap-1.5 mb-1 font-semibold uppercase tracking-wider text-[10px]">
                          <StickyNote className="h-3 w-3" /> Internal note ·{" "}
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                        {m.body}
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border rounded-bl-sm"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                        {mine ? "OPSQAI" : "Customer"} ·{" "}
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border p-3 space-y-2 bg-background">
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <StickyNote className="h-3.5 w-3.5" />
                Internal note (not visible to customer)
              </label>
            </div>
            <div className="flex gap-2 items-end">
              <Textarea
                rows={2}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (reply.trim() && !send.isPending) send.mutate();
                  }
                }}
                placeholder={internal ? "Write an internal note…" : "Reply to customer…"}
                className="resize-none flex-1"
              />
              <Button
                onClick={() => send.mutate()}
                disabled={!reply.trim() || send.isPending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <PageHeader
        eyebrow="Management Center"
        title="Support"
        description="Every support conversation across all customers."
      />

      {/* Mobile: show list OR conversation. Desktop: split. */}
      <div className="grid md:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-16rem)] min-h-[520px]">
        <div className={`${selected ? "hidden md:flex" : "flex"} flex-col min-h-0`}>
          {listPane}
        </div>
        <div className={`${selected ? "flex" : "hidden md:flex"} flex-col min-h-0`}>
          {conversationPane}
        </div>
      </div>
    </div>
  );
}
