/**
 * ChatWorkspace — Teams-style two-column people chat used by Self-Hosted,
 * Management Center and the Customer Portal. Presentation only: it reuses the
 * existing chat server functions, permissions and storage unchanged.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  X,
  ArrowLeft,
  Send,
  Paperclip,
  Search,
  Pencil,
  CheckCheck,
  Check,
  Loader2,
  ShieldCheck,
  Image as ImageIcon,
  ImagePlus,
  FileText,
  Copy,
  Download,
} from "lucide-react";
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
import { EmojiPicker } from "@/components/app/chat/emoji-picker";
import { MessageReactions } from "@/components/app/chat/message-reactions";

export function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, now)) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name: string, fallback = "?") {
  const s = (name || "").trim();
  if (!s) return fallback;
  const parts = s.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const label = dayLabel(iso);
  if (label === "Today") return clock(iso);
  if (label === "Yesterday") return "Yesterday";
  return d.toLocaleDateString();
}

function ContactAvatar({
  name,
  size = 36,
  staff = false,
}: {
  name: string;
  size?: number;
  staff?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <Avatar className="rounded-md" style={{ width: size, height: size }}>
        <AvatarFallback className="rounded-md bg-primary/12 text-primary font-medium">
          {initials(name).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {staff && (
        <span className="absolute -bottom-1 -right-1 rounded-sm bg-primary text-primary-foreground p-0.5">
          <ShieldCheck className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function ChatWorkspace({
  userId,
  activeConv,
  onActiveConv,
  onClose,
}: {
  userId: string;
  activeConv: string | null;
  onActiveConv: (id: string | null) => void;
  onClose: () => void;
}) {
  const [composing, setComposing] = useState(false);
  // On phones only one pane is visible at a time.
  const showThreadOnMobile = Boolean(activeConv) || composing;

  return (
    <div className="flex h-full min-h-0 w-full bg-background">
      <aside
        className={cn(
          "flex w-full flex-col border-r border-border md:w-[320px] md:shrink-0",
          showThreadOnMobile && "hidden md:flex",
        )}
      >
        <ConversationList
          userId={userId}
          activeConv={activeConv}
          onSelect={(id) => {
            setComposing(false);
            onActiveConv(id);
          }}
          onNew={() => {
            setComposing(true);
            onActiveConv(null);
          }}
          onClose={onClose}
        />
      </aside>

      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          !showThreadOnMobile && "hidden md:flex",
        )}
      >
        {composing ? (
          <NewChatPane
            onStarted={(id) => {
              setComposing(false);
              onActiveConv(id);
            }}
            onBack={() => setComposing(false)}
            onClose={onClose}
          />
        ) : activeConv ? (
          <ConversationPane
            key={activeConv}
            userId={userId}
            conversationId={activeConv}
            onBack={() => onActiveConv(null)}
            onClose={onClose}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center px-8 text-center">
            <div className="max-w-xs">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md border border-border bg-card">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Select a conversation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick a person on the left, or start a new chat with a colleague or the OPSQAI team.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- Conversation list ----------------

function ConversationList({
  userId,
  activeConv,
  onSelect,
  onNew,
  onClose,
}: {
  userId: string;
  activeConv: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const list = useServerFn(listMyConversations);
  const [filter, setFilter] = useState("");

  const { data: convs = [] } = useQuery<ChatConversation[]>({
    queryKey: ["chat-conversations"],
    queryFn: () => list({ data: {} } as never),
    refetchOnWindowFocus: true,
  });

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter(
      (c) =>
        (c.peer?.full_name || "").toLowerCase().includes(q) ||
        (c.peer?.email || "").toLowerCase().includes(q),
    );
  }, [convs, filter]);

  const unread = convs.reduce((n, c) => n + c.unread_count, 0);

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="font-display text-base font-semibold leading-none text-foreground">
            Chat
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={onNew} aria-label="New chat" title="New chat">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search people"
            className="h-9 pl-8"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No conversations yet. Use the pencil icon to start one.
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-accent/40",
                c.id === activeConv && "bg-accent/60",
              )}
            >
              <ContactAvatar name={c.peer?.full_name || "?"} staff={c.peer?.is_staff ?? false} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {c.peer?.full_name || "Unknown"}
                    {c.peer?.is_staff && (
                      <Badge variant="secondary" className="ml-2 py-0 text-[10px]">
                        OPSQAI
                      </Badge>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {fmtTime(c.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {c.last_message?.sender_id === userId ? "You: " : ""}
                    {c.last_message?.body ||
                      (c.last_message?.has_attachments ? "📎 Attachment" : "No messages yet")}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-sm bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
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

// ---------------- Conversation pane ----------------

function ConversationPane({
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
  const [dragging, setDragging] = useState(false);

  const { data: convs = [] } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => listConv({ data: {} } as never),
  });
  const conv = convs.find((c) => c.id === conversationId);

  const { data: msgs = [], refetch } = useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", conversationId],
    queryFn: () => listFn({ data: { conversation_id: conversationId, limit: 100 } }),
  });

  // Platform-neutral polling (local Postgres has no browser realtime SDK).
  useEffect(() => {
    const timer = window.setInterval(() => {
      void refetch();
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [conversationId, refetch, qc]);

  useEffect(() => {
    markRead({ data: { conversation_id: conversationId } }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["chat-conversations"] });
  }, [conversationId, msgs.length, markRead, qc]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  async function handleFilePick(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name}: max 25 MB`);
        continue;
      }
      try {
        const data = await fileToBase64(f);
        const { path } = await createChatUploadUrl({
          data: {
            conversation_id: conversationId,
            filename: f.name,
            content_type: f.type || "application/octet-stream",
            data_base64: data,
          },
        });
        setPending((p) => [
          ...p,
          { path, name: f.name, mime: f.type || "application/octet-stream", size: f.size },
        ]);
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
      await sendFn({
        data: { conversation_id: conversationId, body: body || undefined, attachments: pending },
      });
      setText("");
      setPending([]);
      await refetch();
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    } catch (e) {
      toast.error(`Message not sent: ${(e as Error).message}`, {
        action: { label: "Retry", onClick: () => void handleSend() },
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 md:hidden"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <ContactAvatar
          name={conv?.peer?.full_name || "?"}
          size={38}
          staff={conv?.peer?.is_staff ?? false}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight text-foreground">
            {conv?.peer?.full_name || "Conversation"}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {conv?.peer?.is_staff ? "OPSQAI Team" : conv?.peer?.email || "Colleague"}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          onClick={onClose}
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div
        ref={scrollRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFilePick(e.dataTransfer.files);
        }}
        className={cn(
          "relative min-h-0 flex-1 overflow-y-auto bg-muted/25 px-4 py-4",
          dragging && "ring-2 ring-inset ring-primary/60",
        )}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/75 text-sm font-medium">
            Drop files or photos to attach
          </div>
        )}
        {msgs.length === 0 && (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No messages yet — say hi 👋
          </div>
        )}
        {msgs.map((m, i) => {
          const mine = m.sender_id === userId;
          const prev = msgs[i - 1];
          const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
          const grouped = Boolean(prev && prev.sender_id === m.sender_id && !newDay);
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-sm border border-border bg-background px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {dayLabel(m.created_at)}
                  </span>
                </div>
              )}
              <MessageRow
                message={m}
                mine={mine}
                grouped={grouped}
                senderName={
                  mine ? "You" : conv?.peer?.full_name || conv?.peer?.email || "Colleague"
                }
                staff={!mine && (conv?.peer?.is_staff ?? false)}
              />
            </div>
          );
        })}
      </div>

      {pending.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-3 py-2">
          {pending.map((a, i) => (
            <div
              key={`${a.path}-${i}`}
              className="flex items-center gap-2 rounded-sm bg-muted px-2 py-1 text-xs"
            >
              {a.mime.startsWith("image/") ? (
                <ImageIcon className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              <span className="max-w-[160px] truncate">{a.name}</span>
              <button
                onClick={() => setPending((p) => p.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${a.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex shrink-0 items-end gap-1.5 border-t border-border bg-background p-2.5">
        <EmojiPicker onPick={(emoji) => setText((t) => t + emoji)} align="start" />
        <label className="cursor-pointer rounded-sm p-2 hover:bg-accent" title="Send a photo">
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            multiple
            onChange={(e) => handleFilePick(e.target.files)}
          />
        </label>
        <label className="cursor-pointer rounded-sm p-2 hover:bg-accent" title="Attach a file">
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
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length === 0) return;
            e.preventDefault();
            const dt = new DataTransfer();
            files.forEach((f) => dt.items.add(f));
            void handleFilePick(dt.files);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message"
          rows={1}
          className="max-h-40 min-h-10 flex-1 resize-none rounded-sm border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={sending || (!text.trim() && pending.length === 0)}
          className="h-10 w-10 shrink-0 rounded-sm"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

// ---------------- Single message row ----------------

function MessageRow({
  message,
  mine,
  grouped,
  senderName,
  staff,
}: {
  message: ChatMessage;
  mine: boolean;
  grouped: boolean;
  senderName: string;
  staff: boolean;
}) {
  const signFn = useServerFn(signChatAttachment);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);

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
          // signing failure keeps the bubble text-only
        }
      }
      setUrls(map);
    })();
  }, [message.attachments, signFn]);

  return (
    <div
      className={cn(
        "group flex items-end gap-2",
        mine ? "justify-end" : "justify-start",
        grouped ? "mt-1" : "mt-3",
      )}
    >
      {!mine &&
        (grouped ? (
          <span className="w-8 shrink-0" />
        ) : (
          <ContactAvatar name={senderName} size={32} staff={staff} />
        ))}

      <div className={cn("flex max-w-[74%] flex-col", mine ? "items-end" : "items-start")}>
        {/* One single bubble per message: name, content, time and status inside. */}
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            mine
              ? "border-primary/40 bg-primary text-primary-foreground"
              : "border-border bg-card text-card-foreground",
          )}
        >
          {!grouped && (
            <div
              className={cn(
                "mb-1 text-[11px] font-semibold",
                mine ? "text-primary-foreground/80" : "text-primary",
              )}
            >
              {senderName}
            </div>
          )}

          {(message.attachments || []).map((a) => {
            const url = urls[a.path];
            if (a.mime.startsWith("image/") && url) {
              return (
                <button
                  key={a.path}
                  type="button"
                  onClick={() => setZoom(url)}
                  className="mb-1.5 block overflow-hidden rounded-sm"
                >
                  <img src={url} alt={a.name} className="max-h-64 rounded-sm object-cover" />
                </button>
              );
            }
            return (
              <a
                key={a.path}
                href={url}
                target="_blank"
                rel="noopener"
                className={cn(
                  "mb-1.5 flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs",
                  mine ? "bg-primary-foreground/12" : "bg-muted",
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{a.name}</span>
                <Download className="ml-auto h-3 w-3 shrink-0 opacity-70" />
              </a>
            );
          })}

          {message.body && <div className="whitespace-pre-wrap break-words">{message.body}</div>}

          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[10px]",
              mine ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            <span>{clock(message.created_at)}</span>
            {mine ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3 opacity-0" />}
          </div>
        </div>

        {/* Hover actions + personal reactions, outside the single bubble. */}
        <div
          className={cn(
            "mt-0.5 flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
            mine ? "flex-row-reverse" : "flex-row",
          )}
        >
          <MessageReactions messageId={message.id} align={mine ? "end" : "start"} />
          {message.body && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(message.body ?? "");
                toast.success("Message copied");
              }}
              className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Copy message"
              title="Copy"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-background/90 p-6"
          onClick={() => setZoom(null)}
          role="presentation"
        >
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-md" />
        </div>
      )}
    </div>
  );
}

// ---------------- New chat ----------------

function NewChatPane({
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
        setResults(await searchFn({ data: { q: term } }));
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
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 text-sm font-semibold text-foreground">New chat</div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          onClick={onClose}
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="shrink-0 border-b border-border px-3 py-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Type name or email (min 2 chars)"
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Suggestions include your colleagues and the OPSQAI team.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
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
            className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left hover:bg-accent/40 disabled:opacity-50"
          >
            <ContactAvatar name={c.full_name || c.email} staff={c.is_staff} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{c.full_name || c.email}</span>
                {c.is_staff && (
                  <Badge variant="secondary" className="py-0 text-[10px]">
                    OPSQAI
                  </Badge>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">{c.email}</div>
            </div>
            {starting === c.id && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        ))}
      </div>
    </>
  );
}
