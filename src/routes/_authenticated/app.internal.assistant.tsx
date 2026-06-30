import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, RefreshCw, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/app/internal/assistant")({
  component: AssistantPage,
  head: () => ({ meta: [{ title: "OPSQAI Assistant · OPSQAI Internal" }] }),
});

const STARTERS_BY_LANG: Record<string, string[]> = {
  en: [
    "How do I create a company?",
    "How do I invite users?",
    "How do I generate an SOP?",
    "How do I run an AI Audit?",
    "How do I assign training?",
    "How do I publish documents?",
    "How do I manage roles?",
    "How do I resolve Knowledge Gaps?",
  ],
  de: [
    "Wie lege ich ein Unternehmen an?",
    "Wie lade ich Benutzer ein?",
    "Wie erstelle ich eine SOP?",
    "Wie führe ich ein KI-Audit durch?",
    "Wie weise ich Schulungen zu?",
    "Wie veröffentliche ich Dokumente?",
    "Wie verwalte ich Rollen?",
    "Wie löse ich Wissenslücken?",
  ],
  ro: [
    "Cum creez o companie?",
    "Cum invit utilizatori?",
    "Cum generez un SOP?",
    "Cum rulez un Audit AI?",
    "Cum atribui un training?",
    "Cum public documente?",
    "Cum gestionez rolurile?",
    "Cum rezolv Knowledge Gaps?",
  ],
};

const UI_STRINGS: Record<string, { eyebrow: string; title: string; subtitle: string; tryAsking: string; sources: string; thinking: string; placeholder: string; send: string; new: string }> = {
  en: { eyebrow: "OPSQAI Assistant", title: "Ask anything about using OPSQAI", subtitle: "Grounded in System Knowledge only — never touches customer data.", tryAsking: "Try asking", sources: "Sources", thinking: "Thinking…", placeholder: "Ask how to use OPSQAI…", send: "Send", new: "New" },
  de: { eyebrow: "OPSQAI Assistent", title: "Fragen Sie alles zur Nutzung von OPSQAI", subtitle: "Basiert ausschließlich auf System-Wissen — keine Kundendaten.", tryAsking: "Fragen Sie z. B.", sources: "Quellen", thinking: "Denke nach…", placeholder: "Wie nutze ich OPSQAI?…", send: "Senden", new: "Neu" },
  ro: { eyebrow: "Asistent OPSQAI", title: "Întreabă orice despre utilizarea OPSQAI", subtitle: "Bazat doar pe System Knowledge — nu accesează date despre clienți.", tryAsking: "Încearcă să întrebi", sources: "Surse", thinking: "Se gândește…", placeholder: "Cum folosesc OPSQAI?…", send: "Trimite", new: "Nou" },
};

type Source = { id: string; title: string; slug: string; category: string; excerpt: string; similarity: number };

function AssistantPage() {
  const { lang } = useT();
  const [token, setToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/internal-chat",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
    [token],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `internal-${sessionId}`,
    messages: [] as UIMessage[],
    transport,
  });

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const submit = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    await sendMessage({ text: q }, { body: { language: lang } });
  };

  const reset = () => {
    setMessages([]);
    setSessionId((n) => n + 1);
  };

  const t = UI_STRINGS[lang] ?? UI_STRINGS.en;
  const starters = STARTERS_BY_LANG[lang] ?? STARTERS_BY_LANG.en;

  return (
    <div className="max-w-3xl mx-auto w-full p-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary/80 font-medium">
            <Sparkles className="h-4 w-4" /> {t.eyebrow}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-0.5">{t.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> {t.new}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 && (
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.tryAsking}</div>
            <div className="flex flex-wrap gap-1.5">
              {starters.map((s) => (
                <Button key={s} variant="outline" size="sm" className="h-auto py-1.5 text-xs"
                  onClick={() => { setInput(s); setTimeout(submit, 0); }}>
                  {s}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const meta = (m as unknown as { metadata?: { sources?: Source[]; hasSources?: boolean } }).metadata;
          const sources = meta?.sources ?? [];
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-2.5 ${isUser ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{text}</div>
                {!isUser && sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/60 space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.sources}</div>
                    {sources.map((s) => (
                      <Link
                        key={s.id}
                        to="/app/internal/knowledge/$slug"
                        params={{ slug: s.slug }}
                        className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"
                      >
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.title}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 ml-auto shrink-0">{s.category}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="text-xs text-muted-foreground animate-pulse">{t.thinking}</div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t pt-3 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={t.placeholder}
          className="resize-none min-h-[44px] max-h-32"
          rows={1}
        />
        <Button onClick={submit} disabled={busy || !input.trim()} className="gap-1.5">
          <Send className="h-4 w-4" /> {t.send}
        </Button>
      </div>
    </div>
  );
}
