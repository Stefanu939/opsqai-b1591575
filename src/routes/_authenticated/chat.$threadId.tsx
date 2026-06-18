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
import { Send, FileText, BookOpenCheck, ScrollText, Copy, Check } from "lucide-react";
import logo from "@/assets/logo.png";
import { z } from "zod";
import ReactMarkdown from "react-markdown";

interface SourceItem {
  type: "document" | "faq";
  id: string;
  title: string;
  code?: string | null;
  excerpt: string;
  similarity?: number;
}

interface MessageMeta { sources?: SourceItem[] }

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
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
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const meta = m.metadata as MessageMeta | undefined;
            const sources = meta?.sources ?? [];
            if (m.role === "user") {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap">{text}</div>
                </div>
              );
            }
            return (
              <div key={m.id} className="flex gap-3 group">
                <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center shrink-0">
                  <img src={logo} alt="" width={20} height={20} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                    {text ? <ReactMarkdown>{text}</ReactMarkdown> : <ThinkingDots label={T("thinking")} />}
                  </div>
                  {text && (
                    <div className="mt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={text} label={T("copy") || "Copy"} />
                    </div>
                  )}
                  {sources.length > 0 && <SourcesPanel sources={sources} T={T} />}
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
            {docs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> {T("documents")}
                </h3>
                <div className="space-y-3">
                  {docs.map((s, i) => (
                    <div key={i} className="rounded-md border border-border p-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        {s.code && <Badge variant="outline" className="font-mono text-[10px]">{s.code}</Badge>}
                        <div className="text-sm font-medium truncate">{s.title}</div>
                      </div>
                      {typeof s.similarity === "number" && (
                        <div className="text-[10px] text-muted-foreground font-mono mb-2">
                          {T("relevance")}: {(s.similarity * 100).toFixed(0)}%
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">{s.excerpt}</p>
                      <div className="mt-2"><CopyButton text={s.excerpt} label={T("copy") || "Copy"} /></div>
                    </div>
                  ))}
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
