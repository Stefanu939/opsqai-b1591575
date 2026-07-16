import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/threads.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { Paperclip, Mic, ArrowUp, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/chat/")({ component: ChatWelcome });

function greet(name?: string | null, lang?: string) {
  const hour = new Date().getHours();
  const part =
    lang === "de"
      ? hour < 12
        ? "Guten Morgen"
        : hour < 18
          ? "Guten Tag"
          : "Guten Abend"
      : lang === "ro"
        ? hour < 12
          ? "Bună dimineața"
          : hour < 18
            ? "Bună ziua"
            : "Bună seara"
        : hour < 12
          ? "Good morning"
          : hour < 18
            ? "Good afternoon"
            : "Good evening";
  return name ? `${part}, ${name}` : part;
}

function ChatWelcome() {
  const navigate = useNavigate();
  const newThread = useServerFn(createThread);
  const { user, scopeCompanyId } = useAuth();
  const { lang } = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const name = (user?.user_metadata as any)?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  const submit = async () => {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      // Bind the thread to the active workspace so RAG retrieval and FAQ
      // matching automatically scope to the tenant the admin is viewing.
      const th = await newThread({
        data: { title: q.slice(0, 60), companyId: scopeCompanyId ?? undefined },
      });
      navigate({ to: "/app/chat/$threadId", params: { threadId: th.id }, search: { q } });
    } catch (e) {
      toast.error(String(e));
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const prompts = [
    "SOPs",
    "Warehouse Operations",
    "Transport Planning",
    "Internal Procedures",
    "Safety Instructions",
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 min-h-[calc(100vh-3.5rem)] md:min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold-line)] bg-card/60 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-gold" />
          <span className="tracking-wide uppercase">OPSQAI Assistant</span>
        </div>
        <h1 className="mt-6 font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
          {greet(name, lang)}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {lang === "de" ? "Wie kann ich heute helfen?" : "How can I help you today?"}
        </p>

        <div className="mt-10 rounded-2xl border border-border bg-card shadow-md p-2 focus-within:border-gold/60 focus-within:shadow-lg focus-within:ring-4 focus-within:ring-gold/10 transition-all">
          <Textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={lang === "de" ? "Stelle eine Frage…" : "Ask anything…"}
            rows={2}
            className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] min-h-[64px] placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" title="Attach" disabled>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" title="Voice" disabled>
                <Mic className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={submit}
              disabled={!text.trim() || busy}
              size="icon"
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              onClick={() => setText(`Tell me about ${p}`)}
              className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:border-gold/50 hover:text-foreground transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        <p className="mt-8 text-[11px] text-muted-foreground/70">
          {lang === "de"
            ? "Frühere Unterhaltungen findest du in der Seitenleiste."
            : "Past conversations are listed in the sidebar."}
        </p>
      </div>
    </div>
  );
}
