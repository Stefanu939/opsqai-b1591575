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
  const part = lang === "de"
    ? hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend"
    : lang === "ro"
    ? hour < 12 ? "Bună dimineața" : hour < 18 ? "Bună ziua" : "Bună seara"
    : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
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
    const q = text.trim(); if (!q || busy) return;
    setBusy(true);
    try {
      // Bind the thread to the active workspace so RAG retrieval and FAQ
      // matching automatically scope to the tenant the admin is viewing.
      const th = await newThread({ data: { title: q.slice(0, 60), companyId: scopeCompanyId ?? undefined } });
      navigate({ to: "/app/chat/$threadId", params: { threadId: th.id }, search: { q } });
    } catch (e) { toast.error(String(e)); setBusy(false); }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const prompts = [
    "SOPs", "Warehouse Operations", "Transport Planning",
    "Internal Procedures", "Safety Instructions",
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 min-h-[calc(100vh-3.5rem)] md:min-h-screen">
      <div className="w-full max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> AI Assistant
        </div>
        <h1 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight">
          {greet(name, lang)} <span className="inline-block">👋</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          {lang === "de" ? "Wie kann ich heute helfen?" : lang === "ro" ? "Cum te pot ajuta astăzi?" : "How can I help you today?"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {lang === "de" ? "Frag mich zu:" : lang === "ro" ? "Întreabă-mă despre:" : "Ask anything about:"}{" "}
          {prompts.map((p, i) => (
            <span key={p}>
              <button onClick={() => setText(`Tell me about ${p}`)} className="text-primary hover:underline">{p}</button>
              {i < prompts.length - 1 && " · "}
            </span>
          ))}
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card shadow-lg p-2 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
          <Textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={lang === "de" ? "Stelle eine Frage…" : lang === "ro" ? "Scrie o întrebare…" : "Send a message…"}
            rows={2}
            className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] min-h-[60px]"
          />
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" title="Attach" disabled>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" title="Voice" disabled>
                <Mic className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={submit} disabled={!text.trim() || busy} size="icon" className="h-8 w-8 rounded-full">
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          {lang === "de"
            ? "Frühere Unterhaltungen findest du in der Seitenleiste."
            : lang === "ro"
            ? "Găsești conversațiile anterioare în bara laterală."
            : "Your past conversations are listed in the sidebar."}
        </p>

      </div>
    </div>
  );
}
