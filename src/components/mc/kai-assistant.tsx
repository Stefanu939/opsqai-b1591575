import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  Users,
  Square,
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  History,
  Copy,
  RefreshCw,
  Rocket,
  Check,
  X,
  ShieldCheck,
  Calculator,
  FileText,
  ClipboardCheck,
  Headphones,
  PhoneOff,
} from "lucide-react";
import { useVoiceMode, voiceSupported } from "@/components/mc/use-voice-mode";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { askKai, logKaiAction, listKaiActions, type KaiAction } from "@/lib/kai.functions";
import { saveCrmLead } from "@/lib/crm.functions";
import { listCompanies } from "@/lib/companies.functions";
import { applyCallDebrief } from "@/lib/sales-tools.functions";
import { useSalesDoc } from "@/components/mc/sales-docs";
import { mailtoUrl, telUrl, whatsappUrl } from "@/lib/mc-outreach";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; actions?: KaiAction[]; stopped?: boolean; at?: number };
type Conv = { id: string; title: string; pinned: boolean; updatedAt: number; messages: Msg[] };

const STORE = "opsqai-kai-conversations-v1";

const SUGGESTIONS = [
  "Ce licențe expiră în următoarele 30 de zile?",
  "Ce servere nu au mai dat semnal de peste 48 de ore?",
  "Pe cine din CRM ar trebui să sun azi?",
  "Caută-mi 5 firme de transport din Cluj cu peste 20 de angajați",
];

function firstName(email?: string | null) {
  const local = (email ?? "").split("@")[0].split(/[._-]/)[0];
  return local ? local[0].toUpperCase() + local.slice(1) : "";
}

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function relTime(t: number) {
  const d = Math.round((Date.now() - t) / 60000);
  if (d < 1) return "acum";
  if (d < 60) return `${d} min`;
  if (d < 1440) return `${Math.round(d / 60)} h`;
  return `${Math.round(d / 1440)} z`;
}

export function KaiOrb({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid place-items-center rounded-full bg-gradient-to-br from-primary to-primary/55 text-primary-foreground shadow-lg shadow-primary/40",
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
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [pendingFor, setPendingFor] = useState<string | null>(null);
  const reqRef = useRef(0);
  const navigate = useNavigate();
  const page = useRouterState({ select: (s) => s.location.pathname });
  const { user, session, loading } = useAuth();
  const name = firstName(user?.email);
  const ask = useServerFn(askKai);
  const addLead = useServerFn(saveCrmLead);
  const saveDebrief = useServerFn(applyCallDebrief);
  const makeDoc = useSalesDoc();
  const fetchCompanies = useServerFn(listCompanies);
  const logAction = useServerFn(logKaiAction);
  const fetchAudit = useServerFn(listKaiActions);
  const endRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setConvs(JSON.parse(raw) as Conv[]);
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(convs.slice(0, 50)));
    } catch {
      /* ignore */
    }
  }, [convs]);

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

  const active = convs.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];
  const pending = pendingFor !== null && pendingFor === activeId;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open, pending]);

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

  const audit = useQuery({
    queryKey: ["kai-audit"],
    queryFn: () => fetchAudit(),
    enabled: open && showAudit,
    staleTime: 5_000,
  });

  const sorted = useMemo(
    () => [...convs].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt),
    [convs],
  );

  const patch = (id: string, fn: (c: Conv) => Conv) => setConvs((all) => all.map((c) => (c.id === id ? fn(c) : c)));

  const run = async (convId: string, history: Msg[]) => {
    const req = ++reqRef.current;
    setPendingFor(convId);
    let reply: Msg;
    try {
      const r = await ask({
        data: {
          messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          page,
          senderName: name || undefined,
        },
      });
      reply = { role: "assistant", content: r.reply, actions: r.actions, at: Date.now() };
    } catch {
      reply = { role: "assistant", content: "Nu am putut răspunde acum. Mai încearcă o dată." };
    }
    if (req !== reqRef.current) return; // stopped or superseded
    setPendingFor(null);
    patch(convId, (c) => ({ ...c, messages: [...c.messages, reply], updatedAt: Date.now() }));
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t || pendingFor) return;
    const userMsg: Msg = { role: "user", content: t };
    let id = activeId;
    let history: Msg[];
    if (!active) {
      id = newId();
      history = [userMsg];
      setConvs((all) => [{ id: id!, title: t.slice(0, 48), pinned: false, updatedAt: Date.now(), messages: history }, ...all]);
      setActiveId(id);
    } else {
      history = [...active.messages, userMsg];
      patch(active.id, (c) => ({ ...c, messages: history, updatedAt: Date.now() }));
    }
    setInput("");
    setShowHistory(false);
    void run(id!, history);
  };

  const voice = useVoiceMode((t) => send(t));
  const spokenRef = useRef(0);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (voice.state !== "thinking" || !last || last.role !== "assistant") return;
    if (spokenRef.current === messages.length) return;
    spokenRef.current = messages.length;
    voice.speak(last.content);
  }, [messages, voice]);
  useEffect(() => {
    if (!open) voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stop = () => {
    reqRef.current++;
    const id = pendingFor;
    setPendingFor(null);
    if (id) patch(id, (c) => ({ ...c, messages: [...c.messages, { role: "assistant", content: "_Oprit._", stopped: true }] }));
  };

  const regenerate = () => {
    if (!active || pendingFor) return;
    const msgs = [...active.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    if (!msgs.length) return;
    patch(active.id, (c) => ({ ...c, messages: msgs }));
    void run(active.id, msgs);
  };

  const newChat = () => {
    if (pendingFor) stop();
    setActiveId(null);
    setShowHistory(false);
    setShowAudit(false);
    setInput("");
  };

  const remove = (id: string) => {
    setConvs((all) => all.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const execAction = async (a: KaiAction) => {
    if (a.type === "open") {
      setOpen(false);
      if (a.to === "/management/companies/$id" && a.id) navigate({ to: "/management/companies/$id", params: { id: a.id } });
      else navigate({ to: a.to as never });
    } else if (a.type === "pricing") {
      setOpen(false);
      const emp = Number(a.employees);
      const st = Number(a.workstations);
      navigate({
        to: "/management/pricing",
        search: {
          company: a.company_name,
          contact: a.contact_name || undefined,
          employees: Number.isFinite(emp) && emp > 0 ? Math.round(emp) : undefined,
          workstations: Number.isFinite(st) && st >= 0 ? Math.min(50, Math.round(st)) : undefined,
          workspaces: Array.isArray(a.workspaces) && a.workspaces.length ? a.workspaces.join(",") : undefined,
        },
      });
    } else if (a.type === "onboard") {
      setOpen(false);
      navigate({
        to: "/management/onboarding",
        search: {
          company: a.company_name,
          cui: a.cui?.replace(/\D/g, "") || undefined,
          contact: a.contact_name || undefined,
          email: a.email && /@/.test(a.email) ? a.email : undefined,
          phone: a.phone || undefined,
        },
      });
    } else if (a.type === "whatsapp") window.open(whatsappUrl(a.phone, a.text), "_blank");
    else if (a.type === "email") window.open(mailtoUrl(a.email, a.subject, a.body), "_blank");
    else if (a.type === "call") window.location.href = telUrl(a.phone);
    else if (a.type === "doc") {
      try {
        const emp = Number(a.employees);
        await makeDoc(a.kind, {
          company_name: a.company_name,
          cui: a.cui?.replace(/\D/g, "") || null,
          contact_name: a.contact_name || null,
          industry: a.industry || null,
          employees: Number.isFinite(emp) && emp > 0 ? Math.round(emp) : null,
        });
        toast.success("PDF descărcat");
      } catch (e) {
        toast.error("Nu am putut genera PDF-ul.");
        throw e;
      }
    } else if (a.type === "debrief") {
      try {
        const stages = ["new", "qualified", "demo", "pilot", "offer", "won", "lost"] as const;
        const stage = stages.find((s) => s === a.stage) ?? null;
        const r = await saveDebrief({
          data: {
            company_name: a.company_name,
            lead_id: a.lead_id && /^[0-9a-f-]{36}$/i.test(a.lead_id) ? a.lead_id : null,
            summary: a.summary,
            stage,
            next_action_at: a.next_action_at || null,
            contact_name: a.contact_name || null,
          },
        });
        toast.success(r.created ? `${a.company_name}: lead nou + debrief salvat.` : `Debrief salvat pentru ${a.company_name}.`);
      } catch (e) {
        toast.error("Nu am putut salva debrief-ul.");
        throw e;
      }
    } else if (a.type === "add_lead") {
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
      } catch (e) {
        toast.error(`Nu am putut adăuga ${a.company_name} în CRM.`);
        throw e;
      }
    }
  };

  const targetOf = (a: KaiAction) =>
    a.type === "open" ? (a.id ? `${a.to}:${a.id}` : a.to)
      : a.type === "whatsapp" || a.type === "call" ? a.phone ?? null
        : a.type === "email" ? a.email ?? null
          : a.company_name;

  const runAction = async (a: KaiAction, requestedAt?: number) => {
    let status: "executed" | "failed" = "executed";
    let error: string | null = null;
    try {
      await execAction(a);
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message.slice(0, 500) : "error";
    }
    const { label, type, ...rest } = a;
    void logAction({
      data: {
        requested_at: new Date(requestedAt ?? Date.now()).toISOString(),
        action_type: type,
        label,
        target: targetOf(a),
        detail: rest as Record<string, unknown>,
        status,
        error,
        conversation_id: activeId,
      },
    }).catch(() => {});
  };

  const iconFor = (a: KaiAction) =>
    a.type === "whatsapp"
      ? MessageCircle
      : a.type === "email"
        ? Mail
        : a.type === "call"
          ? Phone
          : a.type === "add_lead"
            ? UserPlus
            : a.type === "onboard"
              ? Rocket
              : a.type === "pricing"
                ? Calculator
                : a.type === "doc"
                  ? FileText
                  : a.type === "debrief"
                    ? ClipboardCheck
                    : ExternalLink;

  const lastAssistant = messages.length > 0 && messages[messages.length - 1].role === "assistant";

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
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg [&>button]:hidden">
          <SheetHeader className="border-b border-border p-3 text-left">
            <div className="flex items-center gap-2">
              <KaiOrb className={cn("h-9 w-9 shrink-0", pending && "animate-pulse")} />
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate font-display text-base">
                  {active && !showHistory ? active.title : "Kai"}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {pending ? "Kai lucrează…" : "Colegul tău din Management Center"}
                </SheetDescription>
              </div>
              <Button variant="ghost" size="icon" aria-label="Conversație nouă" title="Conversație nouă" onClick={newChat}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant={showHistory ? "secondary" : "ghost"}
                size="icon"
                aria-label="Istoric conversații"
                title="Istoric conversații"
                onClick={() => {
                  setShowHistory((v) => !v);
                  setShowAudit(false);
                }}
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant={showAudit ? "secondary" : "ghost"}
                size="icon"
                aria-label="Jurnal acțiuni"
                title="Jurnal acțiuni (audit)"
                onClick={() => {
                  setShowAudit((v) => !v);
                  setShowHistory(false);
                }}
              >
                <ShieldCheck className="h-4 w-4" />
              </Button>
              {active && !showHistory && !showAudit && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={active.pinned ? "Anulează fixarea" : "Fixează"}
                  title={active.pinned ? "Anulează fixarea" : "Fixează"}
                  onClick={() => patch(active.id, (c) => ({ ...c, pinned: !c.pinned }))}
                >
                  {active.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" aria-label="Închide" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {showAudit ? (
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              <p className="px-1 text-xs text-muted-foreground">
                Fiecare acțiune propusă de Kai și apăsată de un om. Jurnalul nu poate fi editat.
              </p>
              {audit.isLoading && <div className="h-20 animate-pulse rounded-lg bg-secondary/50" />}
              {audit.data?.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">Nicio acțiune înregistrată încă.</p>
              )}
              {audit.data?.map((r) => {
                const t = (v: string | null) => (v ? new Date(v).toLocaleString("ro-RO") : "—");
                return (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{r.label}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          r.status === "executed" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {r.status === "executed" ? "Executat" : "Eșuat"}
                      </span>
                    </div>
                    {r.target && <div className="mt-0.5 truncate text-muted-foreground">{r.action_type} · {r.target}</div>}
                    <ol className="mt-2 space-y-0.5 border-l border-border pl-3">
                      <li><span className="font-medium">Cerut de {r.requested_by}</span> · {t(r.requested_at)}</li>
                      <li><span className="font-medium">Aprobat de {r.approved_by_email ?? "—"}</span> · {t(r.approved_at)}</li>
                      <li>
                        <span className="font-medium">{r.status === "executed" ? "Executat" : "Eșuat"}</span> · {t(r.executed_at ?? r.approved_at)}
                        {r.error && <span className="text-destructive"> — {r.error}</span>}
                      </li>
                    </ol>
                  </div>
                );
              })}
            </div>
          ) : showHistory ? (
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {sorted.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">Nicio conversație salvată încă.</p>
              )}
              {sorted.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-secondary/50",
                    c.id === activeId && "border-primary/30 bg-primary/5",
                  )}
                >
                  {c.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-primary" /> : <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  {renaming === c.id ? (
                    <form
                      className="flex flex-1 items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = renameVal.trim();
                        if (v) patch(c.id, (x) => ({ ...x, title: v.slice(0, 80) }));
                        setRenaming(null);
                      }}
                    >
                      <Input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} className="h-7 text-sm" />
                      <Button type="submit" size="icon" variant="ghost" className="h-7 w-7" aria-label="Salvează">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setActiveId(c.id);
                        setShowHistory(false);
                        setShowAudit(false);
                      }}
                    >
                      <div className="truncate text-sm font-medium">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.messages.length} mesaje · {relTime(c.updatedAt)}
                      </div>
                    </button>
                  )}
                  {renaming !== c.id && (
                    <div className="flex shrink-0 items-center opacity-70 group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={c.pinned ? "Anulează fixarea" : "Fixează"}
                        onClick={() => patch(c.id, (x) => ({ ...x, pinned: !x.pinned }))}
                      >
                        {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Redenumește"
                        onClick={() => {
                          setRenaming(c.id);
                          setRenameVal(c.title);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        aria-label="Șterge"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">
                    Salut{name ? `, ${name}` : ""}! Sunt Kai. Văd clienții, licențele, serverele și CRM-ul, verific firme în
                    ANAF și caut firme noi pe internet. Eu pregătesc, tu decizi și trimiți.
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
                <div key={i} className={cn("group flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm",
                      m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-card",
                      m.stopped && "text-muted-foreground",
                    )}
                  >
                    {m.role === "assistant" ? (
                      <div className="space-y-1.5 [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4">
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
                            <Button
                              key={j}
                              size="sm"
                              variant={a.type === "onboard" ? "default" : "secondary"}
                              className="h-8 gap-1.5"
                              onClick={() => void runAction(a, m.at)}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {a.label}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {m.role === "assistant" && !m.stopped && (
                    <div className="mt-1 flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        aria-label="Copiază"
                        onClick={() => {
                          void navigator.clipboard.writeText(m.content);
                          toast.success("Copiat");
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {i === messages.length - 1 && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Regenerează" onClick={regenerate}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {pending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <KaiOrb className="h-6 w-6 animate-pulse" />
                  <span>Kai se gândește</span>
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  </span>
                </div>
              )}
              {lastAssistant && !pending && null}
              <div ref={endRef} />
            </div>
          )}

          {quickMatches.length > 0 && !showHistory && !showAudit && (
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
            className="border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            {voice.state !== "off" && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3">
                <button
                  type="button"
                  onClick={voice.interrupt}
                  aria-label="Întrerupe"
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-full bg-primary",
                    voice.state === "listening" && "animate-pulse",
                    voice.state === "speaking" && "animate-ping [animation-duration:1.6s]",
                    voice.state === "thinking" && "opacity-60",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {voice.state === "listening" ? "Te ascult…" : voice.state === "thinking" ? "Kai se gândește…" : "Kai vorbește — atinge cercul ca să-l întrerupi"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{voice.interim || "Spune „închide” ca să termini."}</p>
                </div>
                <Button type="button" size="icon" variant="destructive" className="rounded-full" aria-label="Încheie convorbirea" title="Încheie convorbirea" onClick={voice.stop}>
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-1.5 focus-within:border-primary/50">
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
                className="max-h-32 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              {voice.state === "off" && !pending && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Mod voce"
                  title="Mod voce (hands-free)"
                  className="rounded-full text-primary"
                  onClick={() => {
                    if (!voiceSupported()) {
                      toast.error("Browserul nu suportă modul voce. Folosește Chrome sau Edge.");
                      return;
                    }
                    voice.start();
                  }}
                >
                  <Headphones className="h-4 w-4" />
                </Button>
              )}
              {pending ? (
                <Button type="button" size="icon" variant="destructive" aria-label="Oprește" title="Oprește" onClick={stop} className="rounded-full">
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button type="submit" size="icon" aria-label="Trimite" title="Trimite" disabled={!input.trim() || Boolean(pendingFor)} className="rounded-full">
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
              Kai nu trimite și nu modifică nimic singur. Sursele: [DB] · [ANAF] · [Web] · [Estimare]
            </p>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
