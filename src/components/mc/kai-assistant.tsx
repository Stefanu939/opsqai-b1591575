import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  ArrowUp,
  Mail,
  MessageCircle,
  Phone,
  ExternalLink,
  UserPlus,
  Sparkles,
  RotateCcw,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { askKai, type KaiAction } from "@/lib/kai.functions";
import { saveCrmLead } from "@/lib/crm.functions";
import { listCompanies } from "@/lib/companies.functions";
import { mailtoUrl, telUrl, whatsappUrl } from "@/lib/mc-outreach";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; actions?: KaiAction[] };

const SUGGESTIONS = [
  "Ce licențe expiră în următoarele 30 de zile?",
  "Ce servere nu au mai dat semnal de peste 48 de ore?",
  "Pe cine din CRM ar trebui să sun azi?",
  "Analizează CUI 14399840 și scrie-mi un mesaj de abordare",
];

function firstName(email?: string | null) {
  const local = (email ?? "").split("@")[0].split(/[._-]/)[0];
  return local ? local[0].toUpperCase() + local.slice(1) : "";
}

export function KaiOrb({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.45)]",
        className,
      )}
    >
      <Sparkles className="h-1/2 w-1/2" />
    </span>
  );
}

export function KaiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const navigate = useNavigate();
  const page = useRouterState({ select: (s) => s.location.pathname });
  const { user, session, loading } = useAuth();
  const name = firstName(user?.email);
  const ask = useServerFn(askKai);
  const addLead = useServerFn(saveCrmLead);
  const fetchCompanies = useServerFn(listCompanies);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const companies = useQuery({
    queryKey: ["kai-companies"],
    queryFn: () => fetchCompanies({ data: {} }),
    enabled: open && !loading && Boolean(session?.user?.id),
    staleTime: 60_000,
    retry: false,
  });

  const quickMatches = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (q.length < 2 || q.includes(" ")) return [];
    return (companies.data ?? []).filter((c) => c.name.toLowerCase().includes(q)).slice(0, 4);
  }, [input, companies.data]);

  const mut = useMutation({
    mutationFn: (history: Msg[]) =>
      ask({
        data: {
          messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          page,
          senderName: name || undefined,
        },
      }),
    onSuccess: (r) => setMessages((m) => [...m, { role: "assistant", content: r.reply, actions: r.actions }]),
    onError: () =>
      setMessages((m) => [...m, { role: "assistant", content: "Nu am putut răspunde acum. Mai încearcă o dată." }]),
  });

  const send = (text: string) => {
    const t = text.trim();
    if (!t || mut.isPending) return;
    const next = [...messages, { role: "user" as const, content: t }];
    setMessages(next);
    setInput("");
    mut.mutate(next);
  };

  const runAction = async (a: KaiAction) => {
    if (a.type === "open") {
      setOpen(false);
      if (a.to === "/management/companies/$id" && a.id) navigate({ to: "/management/companies/$id", params: { id: a.id } });
      else navigate({ to: a.to as never });
    } else if (a.type === "whatsapp") window.open(whatsappUrl(a.phone, a.text), "_blank");
    else if (a.type === "email") window.open(mailtoUrl(a.email, a.subject, a.body), "_blank");
    else if (a.type === "call") window.location.href = telUrl(a.phone);
    else if (a.type === "add_lead") {
      try {
        await addLead({
          data: {
            company_name: a.company_name,
            contact_name: a.contact_name || null,
            phone: a.phone || null,
            email: a.email && /@/.test(a.email) ? a.email : null,
            notes: a.notes || null,
            language: "ro",
            source: "kai",
            stage: "new",
            currency: "EUR",
            products: [],
          },
        });
        toast.success(`${a.company_name} a fost adăugată în CRM.`);
      } catch {
        toast.error("Nu am putut adăuga prospectul în CRM.");
      }
    }
  };

  const iconFor = (a: KaiAction) =>
    a.type === "whatsapp" ? MessageCircle : a.type === "email" ? Mail : a.type === "call" ? Phone : a.type === "add_lead" ? UserPlus : ExternalLink;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-w-0 max-w-xl flex-1 items-center gap-2.5 rounded-full border border-primary/25 bg-primary/5 py-1.5 pl-1.5 pr-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <KaiOrb className="h-7 w-7 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium text-foreground">Kai</span>
          <span className="hidden sm:inline"> · Întreabă-mă orice despre clienți, licențe, vânzări…</span>
        </span>
        <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium md:inline">⌘K</kbd>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-4 text-left">
            <div className="flex items-center gap-3">
              <KaiOrb className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <SheetTitle className="font-display">Kai</SheetTitle>
                <SheetDescription className="text-xs">Colegul tău din Management Center</SheetDescription>
              </div>
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" aria-label="Conversație nouă" onClick={() => setMessages([])}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">
                  Salut{name ? `, ${name}` : ""}! Sunt Kai. Văd clienții, licențele, serverele și CRM-ul. Pot verifica
                  firme după CUI în ANAF și îți pregătesc mesaje. Trimiterea rămâne mereu la tine.
                </div>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-card",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.actions.map((a, j) => {
                        const Icon = iconFor(a);
                        return (
                          <Button key={j} size="sm" variant="secondary" className="h-8 gap-1.5" onClick={() => void runAction(a)}>
                            <Icon className="h-3.5 w-3.5" />
                            {a.label}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {mut.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <KaiOrb className="h-6 w-6 animate-pulse" />
                Kai se gândește…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {quickMatches.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-4 pt-3">
              {quickMatches.map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5"
                  onClick={() => {
                    setOpen(false);
                    navigate({ to: "/management/companies/$id", params: { id: c.id } });
                  }}
                >
                  <Users className="h-3.5 w-3.5" />
                  {c.name}
                </Button>
              ))}
            </div>
          )}

          <form
            className="flex items-end gap-2 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Scrie-i lui Kai…"
              className="max-h-32 min-h-10 resize-none"
            />
            <Button type="submit" size="icon" aria-label="Trimite" disabled={!input.trim() || mut.isPending}>
              <ArrowUp className="h-4 w-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
