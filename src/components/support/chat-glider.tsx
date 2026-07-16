import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageCircle,
  X,
  ArrowLeft,
  Send,
  Paperclip,
  Search,
  Pencil,
  Check,
  CheckCheck,
  Loader2,
  ShieldCheck,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  listMyConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  searchChatContacts,
  startDirectConversation,
  signChatAttachment,
  createChatUploadUrl,
  type ChatConversation,
  type ChatMessage,
  type ChatContact,
  type ChatAttachment,
} from "@/lib/chat.functions";

const OPEN_KEY = "opsqai.chat.open";
const ACTIVE_KEY = "opsqai.chat.active";

function initials(name: string, fallback = "?") {
  const s = (name || "").trim();
  if (!s) return fallback;
  const parts = s.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString();
}

function ContactAvatar({
  name,
  size = 40,
  staff = false,
}: {
  name: string;
  size?: number;
  staff?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <Avatar style={{ width: size, height: size }}>
        <AvatarFallback className="bg-primary/15 text-primary font-medium">
          {initials(name).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {staff && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-primary text-primary-foreground p-0.5">
          <ShieldCheck className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

export function ChatGlider() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "conv" | "new">("list");

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
      {/* Glider tab — hidden 60% off-screen, slides in on hover/focus */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        className={cn(
          "fixed right-0 bottom-24 z-40 group flex items-center gap-2 rounded-l-full",
          "bg-primary text-primary-foreground shadow-lg",
          "h-14 pl-4 pr-3 transition-transform duration-300 ease-out",
          "translate-x-[calc(100%-40px)] hover:translate-x-0 focus:translate-x-0",
          open && "opacity-0 pointer-events-none",
        )}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="font-medium whitespace-nowrap">Chat</span>
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed z-50 bg-background border border-border shadow-2xl overflow-hidden",
          "transition-transform duration-300 ease-out",
          "right-0 bottom-0 md:bottom-6 md:right-6",
          "w-full h-[100dvh] md:w-[400px] md:h-[640px] md:rounded-2xl",
          "flex flex-col",
          open ? "translate-x-0" : "translate-x-[110%]",
        )}
        aria-hidden={!open}
      >
        {view === "list" && (
          <ConversationsListView
            userId={user.id}
            onSelect={(id) => {
              setActiveConv(id);
              setView("conv");
            }}
            onClose={() => setOpen(false)}
            onNew={() => setView("new")}
          />
        )}
        {view === "conv" && activeConv && (
          <ConversationView
            userId={user.id}
            conversationId={activeConv}
            onBack={() => setView("list")}
            onClose={() => setOpen(false)}
          />
        )}
        {view === "new" && (
          <NewChatView
            onStarted={(convId) => {
              setActiveConv(convId);
              setView("conv");
            }}
            onBack={() => setView("list")}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </>
  );
}

// ---------------- Conversations List ----------------

function ConversationsListView({
  userId,
  onSelect,
  onClose,
  onNew,
}: {
  userId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onNew: () => void;
}) {
  const list = useServerFn(listMyConversations);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");

  const { data: convs = [] } = useQuery<ChatConversation[]>({
    queryKey: ["chat-conversations"],
    queryFn: () => list({ data: {} } as never),
    refetchOnWindowFocus: true,
  });

  // Realtime: refresh on any new message
  useEffect(() => {
    const channel = supabase
      .channel("chat-glider-msgs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter((c) =>
      (c.peer?.full_name || "").toLowerCase().includes(q) ||
      (c.peer?.email || "").toLowerCase().includes(q),
    );
  }, [convs, filter]);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
        <div>
          <div className="font-display font-semibold text-lg leading-none">Chat</div>
          <div className="text-xs opacity-80">
            {convs.reduce((n, c) => n + c.unread_count, 0)} unread
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onNew}
            aria-label="New chat"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations"
            className="pl-8 h-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No conversations yet. Tap <Pencil className="inline h-3 w-3 mx-1" /> to start one with a colleague or OPSQAI Support.
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 border-b border-border/50"
            >
              <ContactAvatar
                name={c.peer?.full_name || "?"}
                staff={c.peer?.is_staff ?? false}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">
                    {c.peer?.full_name || "Unknown"}
                    {c.peer?.is_staff && (
                      <Badge variant="secondary" className="ml-2 text-[10px] py-0">
                        OPSQAI
                      </Badge>
                    )}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {fmtTime(c.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground truncate">
                    {c.last_message?.sender_id === userId ? "You: " : ""}
                    {c.last_message?.body ||
                      (c.last_message?.has_attachments ? "📎 Attachment" : "No messages yet")}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-medium flex items-center justify-center px-1.5">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

// ---------------- Conversation View ----------------

function ConversationView({
  userId,
  conversationId,
  onBack,
  onClose,
}: {
  userId: string;
  conversationId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const listFn = useServerFn(listMessages);
  const sendFn = useServerFn(sendMessage);
  const markRead = useServerFn(markConversationRead);
  const listConv = useServerFn(listMyConversations);
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [sending, setSending] = useState(false);

  const { data: convs = [] } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => listConv({ data: {} } as never),
  });
  const conv = convs.find((c) => c.id === conversationId);

  const { data: msgs = [], refetch } = useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", conversationId],
    queryFn: () => listFn({ data: { conversation_id: conversationId, limit: 100 } }),
  });

  // Realtime for this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`chat-conv-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          refetch();
          qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch, qc]);

  // Mark read on open + when new messages arrive
  useEffect(() => {
    markRead({ data: { conversation_id: conversationId } }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["chat-conversations"] });
  }, [conversationId, msgs.length, markRead, qc]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs]);

  async function handleFilePick(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name}: max 25 MB`);
        continue;
      }
      try {
        const { path, token } = await createChatUploadUrl({
          data: { conversation_id: conversationId, filename: f.name },
        });
        const { error } = await supabase.storage
          .from("chat-attachments")
          .uploadToSignedUrl(path, token, f);
        if (error) throw error;
        setPending((p) => [...p, { path, name: f.name, mime: f.type || "application/octet-stream", size: f.size }]);
      } catch (e) {
        toast.error(`Upload failed: ${(e as Error).message}`);
      }
    }
  }

  async function handleSend() {
    if (sending) return;
    const body = text.trim();
    if (!body && pending.length === 0) return;
    setSending(true);
    try {
      await sendFn({ data: { conversation_id: conversationId, body: body || undefined, attachments: pending } });
      setText("");
      setPending([]);
      await refetch();
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <header className="flex items-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <ContactAvatar
          name={conv?.peer?.full_name || "?"}
          size={36}
          staff={conv?.peer?.is_staff ?? false}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate leading-none">
            {conv?.peer?.full_name || "Conversation"}
          </div>
          <div className="text-[11px] opacity-80 truncate">
            {conv?.peer?.is_staff ? "OPSQAI Team" : conv?.peer?.email || "Colleague"}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1 bg-muted/30"
      >
        {msgs.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-10">
            No messages yet — say hi 👋
          </div>
        )}
        {msgs.map((m, i) => {
          const mine = m.sender_id === userId;
          const prev = msgs[i - 1];
          const grouped = prev && prev.sender_id === m.sender_id;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              mine={mine}
              grouped={grouped ?? false}
            />
          );
        })}
      </div>

      {pending.length > 0 && (
        <div className="px-3 py-2 border-t border-border shrink-0 flex flex-wrap gap-2">
          {pending.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-muted rounded px-2 py-1 text-xs"
            >
              {a.mime.startsWith("image/") ? (
                <ImageIcon className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              <span className="max-w-[140px] truncate">{a.name}</span>
              <button
                onClick={() => setPending((p) => p.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-2 border-t border-border shrink-0 bg-background">
        <label className="cursor-pointer p-2 rounded-full hover:bg-accent">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          <input
            type="file"
            className="hidden"
            multiple
            onChange={(e) => handleFilePick(e.target.files)}
          />
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message"
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={sending || (!text.trim() && pending.length === 0)}
          className="rounded-full h-10 w-10 shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

function MessageBubble({
  message,
  mine,
  grouped,
}: {
  message: ChatMessage;
  mine: boolean;
  grouped: boolean;
}) {
  const signFn = useServerFn(signChatAttachment);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const atts = message.attachments || [];
    if (atts.length === 0) return;
    (async () => {
      const map: Record<string, string> = {};
      for (const a of atts) {
        try {
          const { url } = await signFn({ data: { path: a.path } });
          map[a.path] = url;
        } catch {
          // ignore
        }
      }
      setUrls(map);
    })();
  }, [message.attachments, signFn]);

  return (
    <div
      className={cn(
        "flex",
        mine ? "justify-end" : "justify-start",
        grouped ? "mt-0.5" : "mt-2",
      )}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-1.5 shadow-sm",
          mine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card text-card-foreground rounded-bl-sm border border-border",
        )}
      >
        {(message.attachments || []).map((a) => {
          const url = urls[a.path];
          if (a.mime.startsWith("image/") && url) {
            return (
              <a
                key={a.path}
                href={url}
                target="_blank"
                rel="noopener"
                className="block mb-1"
              >
                <img
                  src={url}
                  alt={a.name}
                  className="max-h-56 rounded-lg object-cover"
                />
              </a>
            );
          }
          return (
            <a
              key={a.path}
              href={url}
              target="_blank"
              rel="noopener"
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 mb-1 text-xs",
                mine ? "bg-primary-foreground/10" : "bg-muted",
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{a.name}</span>
            </a>
          );
        })}
        {message.body && (
          <div className="text-sm whitespace-pre-wrap break-words">{message.body}</div>
        )}
        <div
          className={cn(
            "text-[10px] mt-0.5 flex items-center gap-1 justify-end",
            mine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          <span>{fmtTime(message.created_at)}</span>
          {mine && <CheckCheck className="h-3 w-3" />}
          {!mine && <Check className="h-3 w-3 opacity-0" />}
        </div>
      </div>
    </div>
  );
}

// ---------------- New Chat / Contact Search ----------------

function NewChatView({
  onStarted,
  onBack,
  onClose,
}: {
  onStarted: (convId: string) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const searchFn = useServerFn(searchChatContacts);
  const startFn = useServerFn(startDirectConversation);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchFn({ data: { q: term } });
        setResults(r);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, searchFn]);

  async function start(contact: ChatContact) {
    setStarting(contact.id);
    try {
      const { conversation_id } = await startFn({ data: { target_user_id: contact.id } });
      onStarted(conversation_id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStarting(null);
    }
  }

  return (
    <>
      <header className="flex items-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0 font-medium">New chat</div>
        <Button
          size="icon"
          variant="ghost"
          className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="px-3 py-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Type name or email (min 2 chars)"
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Suggestions include your colleagues and the OPSQAI team.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Searching…
          </div>
        )}
        {!loading && q.trim().length >= 2 && results.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No people found for "{q.trim()}".
          </div>
        )}
        {results.map((c) => (
          <button
            key={c.id}
            onClick={() => start(c)}
            disabled={starting === c.id}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 border-b border-border/50 disabled:opacity-50"
          >
            <ContactAvatar name={c.full_name || c.email} staff={c.is_staff} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{c.full_name || c.email}</span>
                {c.is_staff && (
                  <Badge variant="secondary" className="text-[10px] py-0">
                    OPSQAI
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">{c.email}</div>
            </div>
            {starting === c.id && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        ))}
      </div>
    </>
  );
}
