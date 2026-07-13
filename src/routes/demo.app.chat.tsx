import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, FileText } from "lucide-react";

export const Route = createFileRoute("/demo/app/chat")({
  component: DemoChatPage,
});

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ code: string }>;
}

const SUGGESTIONS = [
  "What do I do with a damaged parcel on arrival?",
  "Which PPE is mandatory in the warehouse?",
  "How long can a cold-chain pallet stay on the dock?",
  "Who do I notify if a forklift fails inspection?",
];

function extractSources(text: string): Array<{ code: string }> {
  // The demo AI endpoint appends "Sources: [SOP-CODE]" — extract for chip rendering.
  const m = /Sources?:\s*([^\n]+)/i.exec(text);
  if (!m) return [];
  return Array.from(m[1].matchAll(/\[?([A-Z]+-[A-Z]+-\d+)\]?/g)).map((r) => ({ code: r[1] }));
}

function DemoChatPage() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs, busy]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    setMsgs((m) => [...m, { role: "user", content }]);
    setBusy(true);
    try {
      const res = await fetch("/api/demo-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [...msgs, { role: "user", content }] }),
      });
      if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}`);
      const data = (await res.json()) as { reply: string };
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.reply, sources: extractSources(data.reply) },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary/85 font-medium">
        <Sparkles className="h-3.5 w-3.5" /> AI Assistant
      </div>
      <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
        Ask Atlas Logistics' operational AI
      </h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Grounded in this tenant's SOPs, policies, work instructions and FAQ. Answers include source
        citations.
      </p>

      <Card className="mt-6 p-0 overflow-hidden">
        <div ref={scroller} className="h-[480px] overflow-y-auto p-4 space-y-3 bg-muted/20">
          {msgs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Try one of these operational questions:
              <div className="mt-4 grid gap-2 max-w-md mx-auto">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-left text-xs rounded-md border border-border/60 px-3 py-2 hover:bg-background transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border border-border/60"}`}
                >
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.sources.map((s) => (
                        <span
                          key={s.code}
                          className="inline-flex items-center gap-1 text-[10px] rounded-md border border-primary/30 bg-primary/5 text-primary px-1.5 py-0.5"
                        >
                          <FileText className="h-2.5 w-2.5" /> {s.code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {busy && <div className="text-xs text-muted-foreground">OPSQAI is thinking…</div>}
          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2 border-t border-border/60 p-3 bg-background"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about inbound, outbound, safety, forklift, onboarding…"
            disabled={busy}
            maxLength={500}
          />
          <Button type="submit" disabled={busy || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
