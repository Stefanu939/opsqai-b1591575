import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { kaiActionKey, resolveKaiConfirmation, type KaiActionResult } from "@/lib/kai-confirmation";
import { toast } from "sonner";
import {
  Mail,
  MessageCircle,
  Phone,
  ExternalLink,
  UserPlus,
  Maximize2,
  Minimize2,
  Users,
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
  CalendarPlus,
  Car,
} from "lucide-react";
import { useVoiceMode, voiceSupported } from "@/components/mc/use-voice-mode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/lib/auth-context";
import { useMyName } from "@/lib/use-my-name";
import {
  askKai,
  logKaiAction,
  listKaiActions,
  sendTeamEmail,
  type KaiAction,
} from "@/lib/kai.functions";
import { upsertCalendarEvent } from "@/lib/calendar.functions";
import { requestTimeOff } from "@/lib/time-off.functions";
import { saveCrmLead } from "@/lib/crm.functions";
import { listCompanies } from "@/lib/companies.functions";
import { applyCallDebrief } from "@/lib/sales-tools.functions";
import { useSalesDoc } from "@/components/mc/sales-docs";
import { mailtoUrl, telUrl, whatsappUrl } from "@/lib/mc-outreach";
import { cn } from "@/lib/utils";

type Msg = {
  role: "user" | "assistant";
  content: string;
  actions?: KaiAction[];
  results?: Record<string, KaiActionResult>;
  stopped?: boolean;
  at?: number;
};
type Conv = { id: string; title: string; pinned: boolean; updatedAt: number; messages: Msg[] };

const STORE = "opsqai-kai-conversations-v1";

const SUGGESTIONS = [
  "Ce licențe expiră în următoarele 30 de zile?",
  "Ce servere nu au mai dat semnal de peste 48 de ore?",
  "Pe cine din CRM ar trebui să sun azi?",
  "Caută-mi 5 firme de transport din Cluj cu peste 20 de angajați",
];

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
        "relative grid place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary",
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        className="h-3/4 w-3/4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 15v18m0-9 15-9m-15 9 15 9M34 18v12" strokeLinecap="round" />
        <circle cx="34" cy="13" r="2" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export function KaiAssistant() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const actionLocks = useRef(new Set<string>());
  const actionInFlight = useRef(false);
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
  const { firstName: name, fullName } = useMyName();
  const ask = useServerFn(askKai);
  const addLead = useServerFn(saveCrmLead);
  const saveDebrief = useServerFn(applyCallDebrief);
  const saveEvent = useServerFn(upsertCalendarEvent);
  const askTimeOff = useServerFn(requestTimeOff);
  const mailTeam = useServerFn(sendTeamEmail);
  const makeDoc = useSalesDoc();
  const fetchCompanies = useServerFn(listCompanies);
  const logAction = useServerFn(logKaiAction);
  const fetchAudit = useServerFn(listKaiActions);
  const endRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const saved = JSON.parse(raw) as Conv[];
        if (Array.isArray(saved)) {
          setConvs(saved);
          const selected = localStorage.getItem(`${STORE}-active`);
          setActiveId(saved.some((c) => c.id === selected) ? selected : (saved[0]?.id ?? null));
        }
      }
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

  useEffect(() => {
    if (!loaded.current) return;
    if (activeId) localStorage.setItem(`${STORE}-active`, activeId);
    else localStorage.removeItem(`${STORE}-active`);
  }, [activeId]);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("opsqai:open-kai", show);
    return () => window.removeEventListener("opsqai:open-kai", show);
  }, []);

  useEffect(() => {
    if (open && !showHistory && !showAudit && !renaming) composerRef.current?.focus();
  }, [open, activeId, pendingFor, showHistory, showAudit, renaming]);

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
    () =>
      [...convs].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt),
    [convs],
  );

  const coordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const locAsked = useRef(false);
  const askLocation = () => {
    if (locAsked.current || typeof navigator === "undefined" || !navigator.geolocation) return;
    locAsked.current = true;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        coordsRef.current = {
          lat: +p.coords.latitude.toFixed(2),
          lon: +p.coords.longitude.toFixed(2),
        };
      },
      () => {},
      { maximumAge: 30 * 60_000, timeout: 8000 },
    );
  };

  const patch = (id: string, fn: (c: Conv) => Conv) =>
    setConvs((all) => all.map((c) => (c.id === id ? fn(c) : c)));

  const run = async (convId: string, history: Msg[]) => {
    askLocation();
    const req = ++reqRef.current;
    setPendingFor(convId);
    let reply: Msg;
    try {
      const r = await ask({
        data: {
          messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          page,
          senderName: fullName || name || undefined,
          mode: carRef.current ? "car" : "chat",
          localTime: new Date().toLocaleString("ro-RO", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          }),
          coords: coordsRef.current ?? undefined,
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
    if (/^(conversație nouă|conversatie noua)$/i.test(t)) {
      newChat();
      voice.speak("Desigur. Începem o conversație nouă.");
      return;
    }
    const userMsg: Msg = { role: "user", content: t, at: Date.now() };
    if (active) {
      const proposal = [...active.messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.actions?.length);
      const available =
        proposal?.actions?.filter((a) => !proposal.results?.[kaiActionKey(a)]) ?? [];
      const approval = resolveKaiConfirmation(t, available);
      if (approval.kind !== "none") {
        patch(active.id, (c) => ({
          ...c,
          messages: [...c.messages, userMsg],
          updatedAt: Date.now(),
        }));
        setInput("");
        if (approval.kind === "matched" && proposal) {
          void runAction(approval.action, proposal.at, active.id);
        } else {
          const content =
            approval.kind === "missing"
              ? "Nu există o acțiune nouă de confirmat. Acțiunile finalizate nu sunt executate din nou."
              : "Am nevoie de o confirmare precisă: numele firmei sau acțiunea dorită, fără schimbarea datelor propuse.";
          patch(active.id, (c) => ({
            ...c,
            messages: [...c.messages, { role: "assistant", content, at: Date.now() }],
          }));
          voice.speak(content);
        }
        return;
      }
    }
    const id = active?.id ?? newId();
    const history = active ? [...active.messages, userMsg] : [userMsg];
    if (!active) {
      setConvs((all) => [
        { id, title: t.slice(0, 48), pinned: false, updatedAt: Date.now(), messages: history },
        ...all,
      ]);
      setActiveId(id);
    } else patch(active.id, (c) => ({ ...c, messages: history, updatedAt: Date.now() }));
    setInput("");
    setShowHistory(false);
    composerRef.current?.focus();
    void run(id, history);
  };

  const voice = useVoiceMode((t) => send(t));

  // ---- Car Mode: fullscreen hands-free cockpit ----
  const [car, setCar] = useState(false);
  const carRef = useRef(false);
  carRef.current = car;
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("kai") === "car"
    )
      setCar(true);
  }, []);
  useEffect(() => {
    if (!car) {
      void wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
      return;
    }
    const nav = navigator as unknown as {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    const lock = () =>
      nav.wakeLock
        ?.request("screen")
        .then((l) => {
          wakeRef.current = l;
        })
        .catch(() => {});
    void lock();
    const onVis = () => {
      if (document.visibilityState === "visible") void lock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [car]);
  const startCar = () => {
    if (!voiceSupported()) {
      toast.error("Modul Mașină are nevoie de Chrome sau Edge (recunoaștere vocală).");
      return;
    }
    carRef.current = true;
    setOpen(false);
    setCar(true);
    askLocation();
    if (voice.state === "off") voice.start();
  };
  const endCar = () => {
    voice.stop();
    carRef.current = false;
    setCar(false);
  };
  const spokenRef = useRef("");
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (voice.state !== "thinking" || !last || last.role !== "assistant") return;
    const spokenKey = `${activeId}:${last.at ?? messages.length}`;
    if (spokenRef.current === spokenKey) return;
    spokenRef.current = spokenKey;
    voice.speak(last.content);
  }, [messages, voice, activeId]);
  useEffect(() => {
    if (!open && !carRef.current) voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stop = () => {
    if (actionInFlight.current) {
      toast.info(
        "Acțiunea confirmată este deja în curs. Așteaptă rezultatul înainte de o cerere nouă.",
      );
      return;
    }
    reqRef.current++;
    const id = pendingFor;
    setPendingFor(null);
    if (id)
      patch(id, (c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: "_Oprit._", stopped: true }],
      }));
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
    if (actionInFlight.current) return;
    if (pendingFor) stop();
    voice.stop();
    spokenRef.current = "";
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
      if (a.to === "/management/companies/$id" && a.id)
        navigate({ to: "/management/companies/$id", params: { id: a.id } });
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
          workspaces:
            Array.isArray(a.workspaces) && a.workspaces.length ? a.workspaces.join(",") : undefined,
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
          lead: a.lead_id && /^[0-9a-f-]{36}$/i.test(a.lead_id) ? a.lead_id : undefined,
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
        toast.success("Document HTML deschis");
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
        toast.success(
          r.created
            ? `${a.company_name}: lead nou + debrief salvat.`
            : `Debrief salvat pentru ${a.company_name}.`,
        );
      } catch (e) {
        toast.error("Nu am putut salva debrief-ul.");
        throw e;
      }
    } else if (a.type === "time_off") {
      try {
        const r = await askTimeOff({
          data: { startsOn: a.starts_on, endsOn: a.ends_on, reason: a.reason || null },
        });
        toast.success(
          r.status === "approved"
            ? `Concediu ${a.starts_on} – ${a.ends_on} aprobat și pus în calendar.`
            : `Cerere de concediu ${a.starts_on} – ${a.ends_on} trimisă spre aprobare.`,
        );
      } catch (e) {
        toast.error("Nu am putut seta concediul.");
        throw e;
      }
    } else if (a.type === "calendar" || a.type === "task") {
      try {
        const start = new Date(a.type === "task" ? a.due_at : a.starts_at);
        const end =
          a.type === "calendar" && a.ends_at
            ? new Date(a.ends_at)
            : new Date(start.getTime() + (a.type === "task" ? 30 : 60) * 60_000);
        await saveEvent({
          data: {
            title: a.type === "task" ? `Task: ${a.title}` : a.title,
            description: a.description || null,
            kind: a.type === "task" ? "deadline" : (a.kind ?? "meeting"),
            location: a.type === "calendar" ? a.location || null : null,
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            all_day: false,
            scope: "platform",
          },
        });
        toast.success(
          a.type === "task"
            ? `Task adăugat: ${a.title}`
            : `Ședință adăugată în calendar: ${a.title}`,
        );
      } catch (e) {
        toast.error("Nu am putut adăuga în calendar.");
        throw e;
      }
    } else if (a.type === "team_email") {
      try {
        const r = await mailTeam({ data: { to: a.to, subject: a.subject, body: a.body } });
        if (r.sent.length) toast.success(`Email trimis către ${r.sent.join(", ")}`);
        if (r.failed.length) toast.error(`Nu s-a putut trimite către ${r.failed.join(", ")}`);
        if (r.failed.length)
          throw new Error(
            `Trimitere parțială: ${r.sent.length} trimise, ${r.failed.length} eșuate. Verifică jurnalul înainte de o nouă cerere.`,
          );
        if (!r.sent.length) throw new Error("not sent");
      } catch (e) {
        toast.error(
          e instanceof Error && e.message !== "not sent" ? e.message : "Emailul nu a fost trimis.",
        );
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
    a.type === "open"
      ? a.id
        ? `${a.to}:${a.id}`
        : a.to
      : a.type === "whatsapp" || a.type === "call"
        ? (a.phone ?? null)
        : a.type === "email"
          ? (a.email ?? null)
          : a.type === "team_email"
            ? a.to.join(", ")
            : a.type === "time_off"
              ? `${a.starts_on}..${a.ends_on}`
              : a.type === "calendar" || a.type === "task"
                ? a.title
                : a.company_name;

  const runAction = async (a: KaiAction, requestedAt?: number, conversationId = activeId) => {
    if (!conversationId || pendingFor || actionInFlight.current) return;
    const key = kaiActionKey(a);
    const lock = `${conversationId}:${requestedAt}:${key}`;
    if (actionLocks.current.has(lock)) return;
    const conversation = convs.find((c) => c.id === conversationId);
    const proposal = conversation?.messages.find(
      (m) => m.at === requestedAt && m.actions?.some((action) => kaiActionKey(action) === key),
    );
    if (!proposal || proposal.results?.[key]) return;
    actionLocks.current.add(lock);
    actionInFlight.current = true;
    const update = (result: KaiActionResult) =>
      patch(conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m === proposal ||
          (m.at === requestedAt && m.actions?.some((action) => kaiActionKey(action) === key))
            ? { ...m, results: { ...m.results, [key]: result } }
            : m,
        ),
      }));
    update({ status: "running" });
    setPendingFor(conversationId);
    let status: "executed" | "failed" = "executed";
    let error: string | null = null;
    let content = "";
    try {
      await execAction(a);
      content =
        a.type === "add_lead"
          ? `${a.company_name} a fost adăugată în CRM.`
          : a.type === "time_off"
            ? "Cererea de concediu a fost înregistrată; aprobarea urmează regulile echipei."
            : a.type === "calendar"
              ? `Ședința „${a.title}” a fost adăugată în calendar.`
              : a.type === "task"
                ? `Taskul „${a.title}” a fost adăugat.`
                : a.type === "team_email"
                  ? "Emailul a fost trimis către destinatarii OPSQAI confirmați."
                  : a.type === "debrief"
                    ? `Debrief-ul pentru ${a.company_name} a fost salvat.`
                    : a.type === "email" || a.type === "whatsapp"
                      ? "Am deschis mesajul pregătit. Trimiterea rămâne în aplicația dumneavoastră."
                      : a.type === "doc"
                        ? "Documentul HTML personalizat a fost pregătit."
                        : a.type === "onboard"
                          ? "Am deschis înrolarea cu datele completate; licența se finalizează în cei trei pași."
                          : `Am deschis: ${a.label}.`;
      update({ status, message: content });
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message.slice(0, 500) : "Acțiunea nu s-a finalizat.";
      content = `Nu am putut finaliza „${a.label}”: ${error}. Nu am reluat automat acțiunea.`;
      update({ status, message: content });
    }
    setPendingFor(null);
    actionInFlight.current = false;
    patch(conversationId, (c) => ({
      ...c,
      messages: [...c.messages, { role: "assistant", content, at: Date.now() }],
      updatedAt: Date.now(),
    }));
    const { label, type, ...rest } = a;
    try {
      const auditResult = await logAction({
        data: {
          requested_at: new Date(requestedAt ?? Date.now()).toISOString(),
          action_type: type,
          label,
          target: targetOf(a),
          detail: { ...rest, confirmation: "explicit-user-approval" },
          status,
          error,
          conversation_id: conversationId,
        },
      });
      if (!auditResult.ok) toast.error("Acțiunea s-a încheiat, dar jurnalul nu a putut fi salvat.");
    } catch {
      toast.error("Acțiunea s-a încheiat, dar jurnalul nu a putut fi salvat.");
    }
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
                    : a.type === "team_email"
                      ? Mail
                      : a.type === "time_off" || a.type === "calendar" || a.type === "task"
                        ? CalendarPlus
                        : ExternalLink;

  const lastAssistant = messages.length > 0 && messages[messages.length - 1].role === "assistant";

  return (
    <>
      <Button
        variant="ghost"
        type="button"
        aria-label="Deschide Kai"
        onClick={() => setOpen(true)}
        className="group flex min-w-0 max-w-xl flex-1 items-center gap-2.5 rounded-full border border-primary/25 bg-primary/5 py-1.5 pl-1.5 pr-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <KaiOrb className="h-7 w-7 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium text-foreground">Kai</span>
          <span className="hidden sm:inline">
            {" "}
            · Întreabă-mă orice despre clienți, licențe, vânzări…
          </span>
        </span>
        <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium md:inline">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        type="button"
        onClick={startCar}
        aria-label="Mod Mașină"
        title="Mod Mașină — vorbește cu Kai la volan"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/5 text-primary transition-colors hover:border-primary/50"
      >
        <Car className="h-4 w-4" />
      </Button>
      {car && (
        <CarMode
          state={voice.state}
          interim={voice.interim}
          lastReply={lastAssistant ? messages[messages.length - 1].content : ""}
          onTap={() =>
            voice.state === "off"
              ? voice.start()
              : voice.state === "speaking"
                ? voice.interrupt()
                : undefined
          }
          onEnd={endCar}
          onOpenChat={() => {
            endCar();
            setOpen(true);
          }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            composerRef.current?.focus();
          }}
          className={cn(
            "flex h-[min(820px,92dvh)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-lg border-primary/20 p-0 [&>button]:hidden",
            expanded && "h-[calc(100dvh-2rem)] max-w-5xl",
          )}
        >
          <DialogHeader className="shrink-0 border-b border-border bg-secondary/40 p-3 text-left">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <KaiOrb className={cn("h-9 w-9 shrink-0", pending && "animate-pulse")} />
              <div className="min-w-[100px] flex-1">
                <DialogTitle className="truncate font-display text-base">
                  Kai{" "}
                  <span className="font-sans text-xs font-normal text-muted-foreground">
                    · alături de tine
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {pending ? "Kai lucrează…" : (active?.title ?? "Cu ce începem azi?")}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Conversație nouă"
                title="Conversație nouă"
                onClick={newChat}
              >
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
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
                aria-label={expanded ? "Micșorează Kai" : "Extinde Kai"}
                title={expanded ? "Micșorează" : "Extinde"}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <Minimize2 /> : <Maximize2 />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Închide"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {showAudit ? (
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              <p className="px-1 text-xs text-muted-foreground">
                Fiecare acțiune propusă de Kai și confirmată de dumneavoastră. Jurnalul nu poate fi
                editat.
              </p>
              {audit.isLoading && <div className="h-20 animate-pulse rounded-lg bg-secondary/50" />}
              {audit.data?.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Nicio acțiune înregistrată încă.
                </p>
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
                          r.status === "executed"
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {r.status === "executed" ? "Executat" : "Eșuat"}
                      </span>
                    </div>
                    {r.target && (
                      <div className="mt-0.5 truncate text-muted-foreground">
                        {r.action_type} · {r.target}
                      </div>
                    )}
                    <ol className="mt-2 space-y-0.5 border-l border-border pl-3">
                      <li>
                        <span className="font-medium">Cerut de {r.requested_by}</span> ·{" "}
                        {t(r.requested_at)}
                      </li>
                      <li>
                        <span className="font-medium">Aprobat de {r.approved_by_email ?? "—"}</span>{" "}
                        · {t(r.approved_at)}
                      </li>
                      <li>
                        <span className="font-medium">
                          {r.status === "executed" ? "Executat" : "Eșuat"}
                        </span>{" "}
                        · {t(r.executed_at ?? r.approved_at)}
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
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Nicio conversație salvată încă.
                </p>
              )}
              {sorted.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-secondary/50",
                    c.id === activeId && "border-primary/30 bg-primary/5",
                  )}
                >
                  {c.pinned ? (
                    <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
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
                      <Input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        className="h-7 text-sm"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Salvează"
                      >
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
                        {c.pinned ? (
                          <PinOff className="h-3.5 w-3.5" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}
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
            <Conversation className="min-h-0">
              <ConversationContent className="gap-5 p-4 sm:p-6">
                {messages.length === 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <KaiOrb className="h-16 w-16" />
                      <h2 className="font-display text-2xl font-semibold">
                        Bună{name ? `, ${name}` : ""}.
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Sunt aici. Ce pregătim împreună?
                      </p>
                      <Button variant="outline" onClick={startCar} className="gap-2">
                        <Car /> {active ? "Reia Modul Mașină" : "Mod Mașină"}
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      {SUGGESTIONS.map((s) => (
                        <Button
                          variant="outline"
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          className="h-auto justify-start whitespace-normal rounded-lg border-border px-3 py-3 text-left text-sm hover:border-primary/40"
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <Message key={i} from={m.role} className="max-w-full">
                    <MessageContent
                      className={cn(
                        "max-w-full break-words",
                        m.role === "user" &&
                          "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground",
                        m.stopped && "text-muted-foreground",
                      )}
                    >
                      {m.role === "assistant" ? (
                        <MessageResponse>{m.content}</MessageResponse>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                      {m.actions?.map((a, j) =>
                        a.type === "team_email" ? (
                          <div
                            key={`p${j}`}
                            className="mt-2.5 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs"
                          >
                            <div className="text-muted-foreground">
                              Către: <span className="text-foreground">{a.to.join(", ")}</span>
                            </div>
                            <div className="mt-0.5 font-medium text-foreground">{a.subject}</div>
                            <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
                              {a.body}
                            </div>
                          </div>
                        ) : null,
                      )}
                      {m.actions?.map((a, j) => {
                        const result = m.results?.[kaiActionKey(a)];
                        const Icon = iconFor(a);
                        return (
                          <div key={j} className="mt-3 w-full min-w-0">
                            <Tool defaultOpen={false} className="mb-2 bg-secondary/20">
                              <ToolHeader
                                type="dynamic-tool"
                                toolName={a.type}
                                title={a.label}
                                state={
                                  result?.status === "executed"
                                    ? "output-available"
                                    : result?.status === "failed"
                                      ? "output-error"
                                      : result?.status === "running"
                                        ? "input-available"
                                        : "approval-requested"
                                }
                              />
                              <ToolContent>
                                <ToolInput input={a} />
                                <ToolOutput
                                  output={
                                    result?.status === "executed" ? result.message : undefined
                                  }
                                  errorText={
                                    result?.status === "failed" ? result.message : undefined
                                  }
                                />
                              </ToolContent>
                            </Tool>
                            {!result && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-auto min-h-10 max-w-full gap-2 whitespace-normal text-left"
                                disabled={Boolean(pendingFor)}
                                onClick={() => void runAction(a, m.at)}
                              >
                                <Icon />
                                {a.label}
                                <Check className="shrink-0" />
                              </Button>
                            )}
                            {result?.message && (
                              <p
                                className={cn(
                                  "text-xs",
                                  result.status === "failed" ? "text-destructive" : "text-success",
                                )}
                              >
                                {result.message}
                              </p>
                            )}
                            {result?.status === "running" && (
                              <p className="text-xs text-muted-foreground">
                                Confirmat · în curs de executare
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </MessageContent>
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
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            aria-label="Regenerează"
                            onClick={regenerate}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </Message>
                ))}

                {pending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <KaiOrb className="h-6 w-6 animate-pulse" />
                    <Shimmer>Kai se gândește…</Shimmer>
                  </div>
                )}
                {lastAssistant && !pending && null}
                <div ref={endRef} />
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
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

          <div className="shrink-0 border-t border-border p-3 sm:p-4">
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
                    {voice.state === "listening"
                      ? "Te ascult…"
                      : voice.state === "thinking"
                        ? "Kai se gândește…"
                        : "Kai vorbește — atinge cercul ca să-l întrerupi"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {voice.interim || "Spune „închide” ca să termini."}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="rounded-full"
                  aria-label="Încheie convorbirea"
                  title="Încheie convorbirea"
                  onClick={voice.stop}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            )}
            <PromptInput onSubmit={({ text }) => send(text)}>
              <PromptInputTextarea
                ref={composerRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrie-i lui Kai…"
                className="min-h-16"
              />
              <PromptInputFooter>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Reia Modul Mașină"
                  title="Reia Modul Mașină"
                  onClick={startCar}
                >
                  <Car />
                </Button>
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
                <PromptInputSubmit
                  aria-label={pending ? "Oprește" : "Trimite"}
                  title={pending ? "Oprește" : "Trimite"}
                  status={pending ? "submitted" : "ready"}
                  onStop={stop}
                  disabled={!pending && (!input.trim() || Boolean(pendingFor))}
                  className="ml-auto shrink-0"
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CarMode(p: {
  state: "off" | "listening" | "thinking" | "speaking";
  interim: string;
  lastReply: string;
  onTap: () => void;
  onEnd: () => void;
  onOpenChat: () => void;
}) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  const label =
    p.state === "listening"
      ? "Vă ascult, domnule."
      : p.state === "thinking"
        ? "Un moment…"
        : p.state === "speaking"
          ? "Atingeți pentru a mă întrerupe"
          : "Atingeți pentru a vorbi";
  const reply = p.lastReply
    .replace(/\[(DB|ANAF|Web|Meteo|Estimare)\]/g, "")
    .replace(/[*_#`]/g, "")
    .slice(0, 220);
  return (
    <div
      className="fixed inset-0 z-[100] flex select-none flex-col bg-background text-foreground"
      role="dialog"
      aria-label="Mod Mașină"
    >
      <div className="flex items-center justify-between p-5">
        <div>
          <div className="font-display text-4xl font-semibold tabular-nums">
            {clock.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-sm capitalize text-muted-foreground">
            {clock.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={p.onOpenChat}
          className="px-4 py-2 text-sm"
        >
          Vezi conversația
        </Button>
      </div>
      <Button
        variant="ghost"
        type="button"
        onClick={p.onTap}
        className="h-auto min-h-0 flex-1 flex-col items-center justify-center gap-8 whitespace-normal px-6 hover:bg-transparent"
        aria-label={label}
      >
        <span className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
          <span
            className={cn(
              "absolute inset-0 rounded-full border-2 border-primary/50",
              p.state === "listening" && "animate-pulse",
              p.state === "speaking" && "animate-ping [animation-duration:1.8s]",
            )}
          />

          <KaiOrb className="h-32 w-32 sm:h-40 sm:w-40" />
        </span>
        <span className="text-center font-display text-2xl font-medium sm:text-3xl">{label}</span>
        <span className="line-clamp-3 min-h-[3.5rem] max-w-xl text-center text-base text-muted-foreground">
          {p.state === "listening" ? p.interim : reply}
        </span>
      </Button>
      <div className="p-5 pb-8">
        <Button
          variant="destructive"
          type="button"
          onClick={p.onEnd}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-destructive text-lg font-semibold text-destructive-foreground"
        >
          <PhoneOff className="h-6 w-6" /> Închide Modul Mașină
        </Button>
      </div>
    </div>
  );
}
