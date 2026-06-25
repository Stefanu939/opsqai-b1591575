import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Send } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Live demo — OPSQAI" },
      { name: "description", content: "Try OPSQAI on a small public demo knowledge base of sample logistics SOPs. No signup required." },
      { property: "og:title", content: "Live demo — OPSQAI" },
      { property: "og:url", content: "https://opsqai.de/demo" },
      { property: "og:description", content: "Try OPSQAI on a small public demo knowledge base of sample logistics SOPs. No signup required." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/demo" }],
  }),
  component: DemoPage,
});

interface Msg { role: "user" | "assistant"; content: string }

const EXAMPLES = [
  "What is the max receiving time for a truck per the inbound SOP?",
  "Welche PSA ist im Lagerbereich vorgeschrieben?",
  "Care este procedura pentru un colet deteriorat la recepție?",
  "Who should I notify if a forklift fails inspection?",
];

function DemoPage() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [msgs, busy]);

  const exchanges = msgs.filter((m) => m.role === "user").length;
  const showCta = exchanges >= 3;

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    if (content.length > 500) { setError("Demo messages are limited to 500 characters."); return; }
    if (exchanges >= 8) { setError("Demo limit reached — book a demo to keep exploring."); return; }
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
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Error ${res.status}`);
      }
      const data = (await res.json()) as { reply: string };
      setMsgs((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Live demo</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">Try OPSQAI on sample logistics SOPs.</h1>
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Demo environment</div>
            <p className="text-muted-foreground text-xs mt-1">This demo answers only from a small public set of sample SOPs. It does not access any customer data. Rate-limited and capped at 8 messages.</p>
          </div>
        </div>

        <Card className="mt-6 p-0 overflow-hidden">
          <div ref={scroller} className="h-[420px] overflow-y-auto p-4 space-y-3">
            {msgs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Ask anything about the sample logistics SOPs — or try one of these:
                <div className="mt-4 grid gap-2">
                  {EXAMPLES.map((q) => (
                    <button key={q} onClick={() => send(q)} className="text-left text-xs rounded-md border border-border/60 px-3 py-2 hover:bg-muted/40 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {busy && <div className="text-xs text-muted-foreground">OPSQAI is thinking…</div>}
            {error && <div className="text-xs text-destructive">{error}</div>}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2 border-t border-border/60 p-3 bg-background"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inbound, outbound, safety…"
              disabled={busy || exchanges >= 8}
              maxLength={500}
            />
            <Button type="submit" disabled={busy || !input.trim()} size="icon"><Send className="h-4 w-4" /></Button>
          </form>
        </Card>

        {showCta && (
          <Card className="mt-6 p-6 border-primary/40 bg-primary/5">
            <h2 className="font-semibold">Ready to try OPSQAI on your own SOPs?</h2>
            <p className="text-sm text-muted-foreground mt-1">Book a 30-minute walkthrough and we'll spin up a tenant for your evaluation.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild><Link to="/contact">Book a demo</Link></Button>
              <Button asChild variant="outline"><Link to="/pricing">See pricing</Link></Button>
              <Button asChild variant="ghost"><Link to="/contact">Contact sales</Link></Button>
            </div>
          </Card>
        )}
      </section>
    </MarketingLayout>
  );
}
