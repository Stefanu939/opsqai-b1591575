import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useT } from "@/i18n";
import {
  Send, FileText, BookOpenCheck, ScrollText, Copy, Check, AlertCircle, Inbox,
  ThumbsUp, ThumbsDown, ExternalLink, Phone, Mail, UserCheck,
} from "lucide-react";
import logo from "@/assets/opsqai-mark.png";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { createInternalRequest } from "@/lib/internal-requests.functions";
import { rateMessage } from "@/lib/feedback.functions";

interface SourceItem {
  type: "document" | "faq";
  id: string;
  document_id?: string;
  title: string;
  code?: string | null;
  excerpt: string;
  similarity?: number;
  version?: number;
  section?: string | null;
  page?: number | null;
  department?: string | null;
  last_updated?: string | null;
  confidence?: "high" | "medium" | "low";
  primary?: boolean;
}

interface Escalation {
  name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
}

interface MessageMeta {
  sources?: SourceItem[];
  mode?: "greeting" | "kb" | "gap" | "followup";
  canCreateRequest?: boolean;
  question?: string;
  confidence?: number;
  minConfidence?: number;
  escalation?: Escalation | null;
}

type ConfBucket = "high" | "medium" | "low";
function bucketConfidence(n: number | undefined | null): ConfBucket {
  const v = typeof n === "number" ? n : 0;
  if (v >= 0.5) return "high";
  if (v >= 0.3) return "medium";
  return "low";
}
function confLabel(b: ConfBucket): string {
  return b === "high" ? "High" : b === "medium" ? "Medium" : "Low";
}
function confClasses(b: ConfBucket): string {
  if (b === "high") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (b === "medium") return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}
// Show a relevance % that rewards a clear primary match while staying truthful for supporting ones.
function displayRelevance(sim: number | undefined, isPrimary: boolean): number {
  const s = typeof sim === "number" ? sim : 0;
  if (isPrimary && s >= 0.3) return Math.min(100, Math.round(50 + s * 80));
  return Math.max(0, Math.min(100, Math.round(s * 100)));
}
// Strip any "Sources:" / "Quellen:" / "Surse:" trailing block the LLM emits — UI renders sources separately.
function stripSourcesBlock(text: string): string {
  if (!text) return text;
  const re = /\n+\s*(?:\*\*|__)?\s*(?:Sources|Quellen|Surse)\s*:?\s*(?:\*\*|__)?[\s\S]*$/i;
  return text.replace(re, "").trimEnd();
}

export const Route = createFileRoute("/_authenticated/app/chat/$threadId")({
  validateSearch: (s: Record<string, unknown>) => z.object({ q: z.string().optional() }).parse(s),
  component: ChatThread,
});

function ChatThread() {
  const { threadId } = Route.useParams();
  const { q } = Route.useSearch();
  const { t, lang } = useT();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  const tokenRef = useRef<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: sess } = await supabase.auth.getSession();
      tokenRef.current = sess.session?.access_token ?? "";
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, parts, sources, created_at")
        .eq("thread_id", threadId)
        .order("created_at");
      const msgs: UIMessage[] = (data ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        parts: (m.parts as UIMessage["parts"]) ?? [{ type: "text", text: m.content }],
        metadata: m.sources ? { sources: m.sources } : undefined,
      }));
      setInitial(msgs);
    };
    load();
  }, [threadId]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      headers: () => ({ Authorization: `Bearer ${tokenRef.current}` }),
      body: () => ({ threadId, language: lang }),
    }),
    [threadId, lang],
  );

  if (!initial) return <div className="flex-1 grid place-items-center text-sm text-muted-foreground">…</div>;

  return <ChatInner key={threadId} threadId={threadId} initial={initial} transport={transport} seed={q} seededRef={seededRef} taRef={taRef} scrollRef={scrollRef} t={t} />;
}

function ChatInner({
  threadId, initial, transport, seed, seededRef, taRef, scrollRef, t,
}: {
  threadId: string;
  initial: UIMessage[];
  transport: DefaultChatTransport<UIMessage>;
  seed?: string;
  seededRef: React.MutableRefObject<boolean>;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  t: (k: never) => string;
}) {
  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => console.error(e),
  });
  const [input, setInput] = useState("");
  const loading = status === "submitted" || status === "streaming";
  const T = t as (k: string) => string;
  const initialIds = useMemo(() => new Set(initial.map((m) => m.id)), [initial]);

  useEffect(() => {
    if (seed && !seededRef.current && initial.length === 0) {
      seededRef.current = true;
      sendMessage({ text: seed });
    }
  }, [seed, sendMessage, seededRef, initial.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, scrollRef]);

  useEffect(() => { if (!loading) taRef.current?.focus(); }, [loading, taRef]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <img src={logo} alt="" width={48} height={48} className="mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{T("askAnything")}</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">{T("ragNote")}</p>
            </div>
          )}
          {messages.map((m) => {
            const rawText = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const meta = m.metadata as MessageMeta | undefined;
            const sources = meta?.sources ?? [];
            if (m.role === "user") {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap">{rawText}</div>
                </div>
              );
            }
            const text = stripSourcesBlock(rawText);
            const isPersisted = initialIds.has(m.id);
            const docs = sources.filter((s) => s.type === "document");
            const primary = docs.find((d) => d.primary) ?? docs[0];
            const answerBucket = bucketConfidence(meta?.confidence);
            const showMeta = text && sources.length > 0 && meta?.mode !== "gap";
            return (
              <div key={m.id} className="flex gap-3 group">
                <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center shrink-0">
                  <img src={logo} alt="" width={20} height={20} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                    {text ? <ReactMarkdown>{text}</ReactMarkdown> : <ThinkingDots label={T("thinking")} />}
                  </div>
                  {showMeta && (
                    <div className="mt-3 flex flex-col gap-1.5 text-xs">
                      {primary && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="opacity-70">Source:</span>
                          <span className="font-medium text-foreground truncate">
                            {primary.code ? `${primary.code} — ${primary.title}` : primary.title}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="opacity-70 text-muted-foreground">Confidence:</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${confClasses(answerBucket)}`}>
                          {confLabel(answerBucket)}
                        </span>
                      </div>
                    </div>
                  )}
                  {text && (
                    <div className="mt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={text} label={T("copy") || "Copy"} />
                    </div>
                  )}
                  {sources.length > 0 && <SourcesPanel sources={sources} answerBucket={answerBucket} T={T} />}
                  {meta?.escalation && meta.escalation.department && (
                    <EscalationCard escalation={meta.escalation} />
                  )}
                  {meta?.canCreateRequest && text && (
                    <CreateRequestCTA threadId={threadId} question={meta.question ?? ""} T={T} />
                  )}
                  {text && isPersisted && <FeedbackBar messageId={m.id} />}
                </div>
              </div>
            );
          })}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center shrink-0">
                <img src={logo} alt="" width={20} height={20} />
              </div>
              <div className="flex-1 pt-2"><ThinkingDots label={T("searching")} /></div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="border-t border-border bg-card">
        <div className="max-w-3xl mx-auto p-3 md:p-4 flex gap-2 items-end">
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={T("typeMessage")}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e as unknown as React.FormEvent); }
            }}
            className="resize-none min-h-[44px] max-h-40"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-11 w-11 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function SourcesPanel({ sources, T }: { sources: SourceItem[]; T: (k: string) => string }) {
  const docs = sources.filter((s) => s.type === "document");
  const faqs = sources.filter((s) => s.type === "faq");
  const primary = docs.find((d) => d.primary) ?? docs[0];
  const supporting = docs.filter((d) => d !== primary);

  const openDoc = async (documentId?: string) => {
    if (!documentId) return;
    const { data: doc } = await supabase
      .from("knowledge_documents").select("file_path").eq("id", documentId).maybeSingle();
    if (!doc?.file_path) return;
    const { data: signed } = await supabase.storage.from("knowledge-docs")
      .createSignedUrl(doc.file_path, 60 * 10);
    if (signed?.signedUrl) window.open(signed.signedUrl, "_blank");
  };

  const DocCard = ({ s, badge }: { s: SourceItem; badge?: string }) => (
    <div className="rounded-md border border-border p-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        {badge && <Badge className="text-[10px]">{badge}</Badge>}
        {s.code && <Badge variant="outline" className="font-mono text-[10px]">{s.code}</Badge>}
        {s.version && <Badge variant="secondary" className="text-[10px]">v{s.version}</Badge>}
        <div className="text-sm font-medium truncate">{s.title}</div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground font-mono mb-2">
        {s.section && <div><span className="opacity-60">Section:</span> {s.section}</div>}
        {s.page && <div><span className="opacity-60">Page:</span> {s.page}</div>}
        {s.department && <div><span className="opacity-60">Dept:</span> {s.department}</div>}
        {s.last_updated && <div><span className="opacity-60">Updated:</span> {new Date(s.last_updated).toLocaleDateString()}</div>}
        {typeof s.similarity === "number" && <div><span className="opacity-60">Relevance:</span> {(s.similarity * 100).toFixed(0)}%</div>}
        {s.confidence && <div><span className="opacity-60">Confidence:</span> {s.confidence}</div>}
      </div>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">{s.excerpt}</p>
      <div className="mt-2 flex items-center gap-3">
        <CopyButton text={s.excerpt} label={T("copy") || "Copy"} />
        {s.document_id && (
          <button onClick={() => openDoc(s.document_id)} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            <ExternalLink className="h-3 w-3" /> Open document
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-3">
      <Sheet>
        <SheetTrigger asChild>
          <button className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline">
            <ScrollText className="h-3.5 w-3.5" />
            {T("viewSources")} ({sources.length})
          </button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{T("sources")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            {primary && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Primary source
                </h3>
                <DocCard s={primary} badge="Primary" />
              </div>
            )}
            {supporting.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  Supporting sources
                </h3>
                <div className="space-y-3">
                  {supporting.map((s, i) => <DocCard key={i} s={s} />)}
                </div>
              </div>
            )}
            {faqs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <BookOpenCheck className="h-3.5 w-3.5" /> FAQ
                </h3>
                <div className="space-y-3">
                  {faqs.map((s, i) => (
                    <div key={i} className="rounded-md border border-border p-3 bg-muted/30">
                      <div className="text-sm font-medium mb-1">{s.title}</div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{s.excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FeedbackBar({ messageId }: { messageId: string }) {
  const rate = useServerFn(rateMessage);
  const [voted, setVoted] = useState<-1 | 1 | null>(null);
  const vote = async (r: -1 | 1) => {
    try {
      await rate({ data: { message_id: messageId, rating: r } });
      setVoted(r);
    } catch (e) { console.error(e); }
  };
  return (
    <div className="mt-2 flex items-center gap-1">
      <button
        onClick={() => vote(1)}
        aria-label="Helpful"
        className={`p-1.5 rounded-md transition-colors ${voted === 1 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => vote(-1)}
        aria-label="Not helpful"
        className={`p-1.5 rounded-md transition-colors ${voted === -1 ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function EscalationCard({ escalation }: { escalation: Escalation }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <UserCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Ask your {escalation.department} manager</div>
          {escalation.name && <div className="text-xs text-muted-foreground mt-0.5">{escalation.name}</div>}
          <div className="mt-3 flex flex-wrap gap-2">
            {escalation.phone && (
              <a href={`tel:${escalation.phone}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs font-medium hover:bg-muted">
                <Phone className="h-3 w-3" /> {escalation.phone}
              </a>
            )}
            {escalation.email && (
              <a href={`mailto:${escalation.email}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs font-medium hover:bg-muted">
                <Mail className="h-3 w-3" /> {escalation.email}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
      </span>
      <span className="italic">{label}</span>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* noop */ }
      }}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {done ? "✓" : label}
    </button>
  );
}

function CreateRequestCTA({ threadId, question, T }: { threadId: string; question: string; T: (k: string) => string }) {
  const create = useServerFn(createInternalRequest);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const onClick = async () => {
    if (!question.trim()) return;
    setState("sending");
    try {
      await create({ data: { question, thread_id: threadId } });
      setState("sent");
    } catch (e) {
      console.error(e);
      setState("error");
    }
  };
  return (
    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{T("kbGapTitle")}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{T("kbGapBody")}</p>
          {state === "sent" ? (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" /> {T("requestSent")}
            </div>
          ) : (
            <Button
              type="button" size="sm" variant="default" className="mt-3 h-8"
              onClick={onClick} disabled={state === "sending"}
            >
              <Inbox className="h-3.5 w-3.5 mr-1.5" />
              {state === "sending" ? T("sending") : T("createInternalRequest")}
            </Button>
          )}
          {state === "error" && <div className="text-xs text-destructive mt-2">{T("errorOccurred")}</div>}
        </div>
      </div>
    </div>
  );
}
