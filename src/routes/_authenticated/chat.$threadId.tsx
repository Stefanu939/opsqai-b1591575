import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n";
import { Send } from "lucide-react";
import logo from "@/assets/logo.png";
import { z } from "zod";

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

  useEffect(() => {
    const load = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token ?? "";
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, parts, created_at")
        .eq("thread_id", threadId)
        .order("created_at");
      const msgs: UIMessage[] = (data ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        parts: (m.parts as UIMessage["parts"]) ?? [{ type: "text", text: m.content }],
      }));
      setInitial(msgs);
      tokenRef.current = token;
    };
    load();
  }, [threadId]);

  const tokenRef = useRef<string>("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
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
  threadId,
  initial,
  transport,
  seed,
  seededRef,
  taRef,
  scrollRef,
  t,
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

  useEffect(() => {
    if (seed && !seededRef.current && initial.length === 0) {
      seededRef.current = true;
      sendMessage({ text: seed });
    }
  }, [seed, sendMessage, seededRef, initial.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, scrollRef]);

  useEffect(() => {
    if (!loading) taRef.current?.focus();
  }, [loading, taRef]);

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
              <p className="text-sm text-muted-foreground">{(t as (k: string) => string)("askAnything")}</p>
            </div>
          )}
          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            if (m.role === "user") {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap">{text}</div>
                </div>
              );
            }
            return (
              <div key={m.id} className="flex gap-3">
                <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center shrink-0">
                  <img src={logo} alt="" width={20} height={20} />
                </div>
                <div className="flex-1 text-sm leading-relaxed whitespace-pre-wrap pt-1">{text || <span className="text-muted-foreground italic">{(t as (k: string) => string)("thinking")}</span>}</div>
              </div>
            );
          })}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center shrink-0">
                <img src={logo} alt="" width={20} height={20} />
              </div>
              <div className="flex-1 text-sm text-muted-foreground italic pt-2">{(t as (k: string) => string)("thinking")}</div>
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
            placeholder={(t as (k: string) => string)("typeMessage")}
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
