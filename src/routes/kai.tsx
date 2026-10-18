import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/i18n";
import { useProspectCopy } from "@/i18n/pages/prospect";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Sparkles, UserPlus, CheckCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { setCloudAudience } from "@/lib/cloud-access";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { askProspectKai, getProspectSession, markProspectConverted } from "@/lib/prospect-chat.functions";
import { PROSPECT_ANON_MESSAGES, PROSPECT_SESSION_MESSAGES, prospectGate, prospectRemaining } from "@/lib/prospect-limits";
import { getProspectStatus, registerProspect, submitProspectLead } from "@/lib/prospect.functions";
import { KaiRichMessage } from "@/components/kai/kai-rich-message";
import { KaiFace } from "@/components/kai/kai-face";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/kai")({
  head: () => ({
    meta: [
      { title: "Discută cu Kai — OPSQAI" },
      { name: "description", content: "Află cum te poate ajuta OPSQAI, direct de la Kai, asistentul AI. Pilot gratuit 30 de zile." },
      { property: "og:title", content: "Discută cu Kai — OPSQAI" },
      { property: "og:description", content: "Întreabă-l pe Kai despre OPSQAI pentru firma ta și cere un pilot gratuit de 30 de zile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/kai" }],
  }),
  component: ProspectPage,
});

const CONSENT_KEY = "opsqai.prospect.consent";
const FORM_TOKEN = "[[CONTACT_FORM]]";
type Msg = { role: "user" | "assistant"; content: string };

function ProspectPage() {
  const { lang, setLang } = useT();
  const t = useProspectCopy();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => { setCloudAudience("prospect"); }, []);
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  };
  if (loading) return <div className="min-h-dvh bg-background" />;
  return (
    <div className="oq-product flex min-h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Link to="/" aria-label={t.home} className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="font-display font-semibold">OPSQAI</span>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
            KAI
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <div role="group" aria-label={t.language} className="flex items-center gap-1">
            {(["ro", "en", "de"] as const).map((code) => (
              <Button key={code} size="sm" variant={lang === code ? "secondary" : "ghost"} aria-pressed={lang === code} onClick={() => setLang(code)} className="h-9 px-2 text-xs uppercase">{code}</Button>
            ))}
          </div>
        {user && (
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> {t.signOut}
          </Button>
        )}
        </div>
      </header>
      <ProspectChat signedIn={Boolean(user)} />
    </div>
  );
}

function ProspectSignIn() {
  const t = useProspectCopy();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const remember = () => {
    setCloudAudience("prospect");
    localStorage.setItem(CONSENT_KEY, consent ? "1" : "0");
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    remember();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/kai` },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    remember();
    await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/kai` });
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4">
        {sent ? (
          <div className="space-y-2 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
            <p className="font-semibold">{t.checkEmail}</p>
            <p className="text-sm text-muted-foreground">
              {t.confirmation} {email}. {t.resume}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h2 className="font-display text-base font-semibold">{t.loginTitle}</h2>
            <p className="text-xs text-muted-foreground">
              {t.loginIntro}
            </p>
            <Button type="button" variant="outline" className="w-full" onClick={google}>
              {t.google}
            </Button>
            <div className="text-center text-xs text-muted-foreground">{t.emailAlternative}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-email">{t.email}</Label>
                <Input id="p-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p-pass">{t.password}</Label>
                <Input id="p-pass" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>
                {t.accountConsent}
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signup" ? t.createContinue : t.signInContinue}
            </Button>
            <Button
              variant="link"
              type="button"
              className="w-full text-center text-xs text-primary"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? t.haveAccount : t.noAccount}
            </Button>
          </form>
        )}
    </div>
  );
}

const SESSION_KEY = "opsqai.prospect.session";
const PENDING_KEY = "opsqai.prospect.pending";
function sessionIdent() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const v = JSON.parse(raw) as { sessionId: string; token: string };
      if (v.sessionId && v.token) return v;
    }
  } catch { /* regenerate */ }
  const v = { sessionId: crypto.randomUUID(), token: `${crypto.randomUUID()}${crypto.randomUUID()}` };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(v)); } catch { /* memory only */ }
  return v;
}
function resetSessionIdent() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
  return sessionIdent();
}



function ProspectChat({ signedIn }: { signedIn: boolean }) {
  const { lang } = useT();
  const t = useProspectCopy();
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["prospect-status"], queryFn: () => getProspectStatus(), enabled: signedIn });
  const [ident, setIdent] = useState<{ sessionId: string; token: string } | null>(null);
  const [restored, setRestored] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [count, setCount] = useState(0);
  const [gate, setGate] = useState<"ok" | "login_required" | "limit_reached">("ok");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const registeredRef = useRef(false);
  const resumedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Restore the session (also after Google / email sign-in redirects).
  // Never leave the chat locked: a session owned by another account or a
  // slow network falls back to a fresh conversation.
  useEffect(() => {
    let active = true;
    setRestored(false);
    const id = sessionIdent();
    setIdent(id);
    const unlock = setTimeout(() => { if (active) setRestored(true); }, 4000);
    void getProspectSession({ data: id }).then((r) => {
      if (!active) return;
      if (r.foreign) { setIdent(resetSessionIdent()); setMsgs([]); setCount(0); return; }
      if (r.messages.length) setMsgs(r.messages.map((m) => ({ role: m.role, content: m.content })));
      setCount(r.count);
    }).catch(() => { /* fresh session */ }).finally(() => { clearTimeout(unlock); if (active) setRestored(true); });
    return () => { active = false; clearTimeout(unlock); };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !status.data || status.data.isProspect || status.data.hasCompany || registeredRef.current) return;
    registeredRef.current = true;
    let consent = false;
    try { consent = localStorage.getItem(CONSENT_KEY) === "1"; } catch { /* optional storage */ }
    void registerProspect({ data: { dataConsent: consent } }).then(() =>
      qc.invalidateQueries({ queryKey: ["prospect-status"] }),
    ).catch(() => { /* Chat and contact form remain available if registration fails. */ });
  }, [signedIn, status.data, qc]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, chatError, gate]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || sendingRef.current || !ident || !restored) return;
    const local = prospectGate(count, signedIn);
    if (local !== "ok") {
      if (local === "login_required") {
        try { localStorage.setItem(PENDING_KEY, text); } catch { /* keep in input */ }
      }
      setGate(local);
      return;
    }
    sendingRef.current = true;
    setChatError(null);
    setGate("ok");
    const before = msgs;
    setMsgs([...msgs, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const r = await askProspectKai({ data: { ...ident, message: text, language: lang } });
      if (r.gate !== "ok") {
        setMsgs(before);
        setInput(text);
        if (r.gate === "login_required") { try { localStorage.setItem(PENDING_KEY, text); } catch { /* noop */ } }
        setGate(r.gate);
        return;
      }
      try { localStorage.removeItem(PENDING_KEY); } catch { /* noop */ }
      setCount(r.count);
      if (!r.ok || !r.text) {
        setChatError(t.unavailable);
        return;
      }
      setMsgs((m) => [...m, { role: "assistant", content: r.text }]);
    } catch (err) {
      console.error("[prospect] send failed", err);
      setMsgs(before);
      setInput(text);
      // Stale/foreign session: start a clean one so the user can retry.
      if (err instanceof Error && /Sesiune/.test(err.message)) { setIdent(resetSessionIdent()); setCount(0); setMsgs([]); }
      setChatError(t.replyError);
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  };

  // After signing in, send the question that hit the login gate.
  useEffect(() => {
    if (!signedIn || !ident || !restored || resumedRef.current) return;
    let pending: string | null = null;
    try { pending = localStorage.getItem(PENDING_KEY); } catch { /* noop */ }
    if (!pending) return;
    setGate("ok");
    const timer = setTimeout(() => { resumedRef.current = true; void send(pending); }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, ident, restored, lang]);

  const submitted = status.data?.submitted;
  const lastIdx = msgs.length - 1;
  const remaining = prospectRemaining(count);
  const openForm = () => (signedIn ? setFormOpen(true) : setGate("login_required"));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <div className="flex flex-wrap items-center justify-between gap-2 py-3">
        <p className="text-sm text-muted-foreground">
          {signedIn
            ? <>{t.remaining}: <span className="font-semibold text-foreground">{remaining}/{PROSPECT_SESSION_MESSAGES}</span></>
            : <>{t.anonymousRemaining}: <span className="font-semibold text-foreground">{Math.max(0, PROSPECT_ANON_MESSAGES - count)}</span></>}
        </p>
        <Button size="sm" onClick={openForm} disabled={submitted}>
          <UserPlus className="mr-1 h-4 w-4" />
          {submitted ? t.requested : t.pilot}
        </Button>
      </div>
      <div className="min-w-0 flex-1 space-y-4 pb-4">
        <div className="flex items-start gap-2">
          <KaiFace size={32} className="mt-0.5 shrink-0" />
          <div className="max-w-[88%] break-words rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm">
            <KaiRichMessage content={t.greeting} />
          </div>
        </div>
        {msgs.map((m, i) => {
          const hasForm = m.content.includes(FORM_TOKEN);
          const content = m.content.replace(FORM_TOKEN, "").trim();
          return m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-xl bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
              {content}
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <KaiFace size={32} className="mt-0.5 shrink-0" />
              <div className="min-w-0 max-w-[88%] break-words rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm">
                <SafeRender fallback={<p className="whitespace-pre-wrap">{content}</p>}>
                  <KaiRichMessage content={content} />
                </SafeRender>
                {hasForm && i === lastIdx && !submitted && (
                  <Button size="sm" className="mt-3" onClick={openForm}>
                    <UserPlus className="mr-1 h-4 w-4" /> {t.contactDetails}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><KaiFace size={32} state="thinking" />{t.typing}</div>}
        {gate === "login_required" && !signedIn && <ProspectSignIn />}
        {gate === "limit_reached" && (
          <div className="rounded-xl border border-primary/30 bg-card p-4 text-sm">
            <p className="font-semibold">{t.limit}</p>
            <p className="mt-1 text-muted-foreground">{t.continueSpecialist}</p>
            {!submitted && <Button size="sm" className="mt-3" onClick={openForm}><UserPlus className="mr-1 h-4 w-4" /> {t.pilot}</Button>}
          </div>
        )}
        {chatError && (
          <div role="alert" className="border-l-2 border-destructive py-2 pl-3 text-sm text-muted-foreground">
            <p>{chatError}</p>
            {!submitted && (
              <Button variant="link" size="sm" className="mt-1 px-0" onClick={openForm}>
                <UserPlus className="mr-1 h-4 w-4" /> {t.requestContact}
              </Button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="sticky bottom-0 border-t border-border bg-background py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="flex gap-2">
          <Input value={input} maxLength={4000} aria-label={t.message} disabled={gate === "limit_reached"} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} />
          <Button type="submit" size="icon" disabled={busy || !restored || !input.trim() || gate === "limit_reached"} aria-label={t.send}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t.notice}
        </p>
      </form>
      <ContactDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transcript={msgs.map((m) => ({ ...m, content: m.content.replace(FORM_TOKEN, "").slice(0, 4000) })).slice(-40)}
        onDone={(leadId) => {
          if (ident) void markProspectConverted({ data: { ...ident, leadId } }).catch(() => { /* optional */ });
          void qc.invalidateQueries({ queryKey: ["prospect-status"] });
        }}
      />
    </main>
  );
}

function ContactDialog({
  open,
  onOpenChange,
  transcript,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transcript: Msg[];
  onDone: (leadId: string | null) => void;
}) {
  const t = useProspectCopy();
  const [v, setV] = useState({ full_name: "", company_name: "", phone: "", employees: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v, x: string) => setV((p) => ({ ...p, [k]: x }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setBusy(true);
    try {
      const res = await submitProspectLead({ data: { ...v, consent_contact: true, transcript } });
      toast.success(t.thanks);
      onOpenChange(false);
      onDone(res.crmLeadId ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.submitError);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.contactTitle}</DialogTitle>
          <DialogDescription>{t.contactIntro}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t.fullName} *</Label>
              <Input required minLength={2} maxLength={120} value={v.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div>
              <Label>{t.company} *</Label>
              <Input required minLength={2} maxLength={160} value={v.company_name} onChange={(e) => set("company_name", e.target.value)} />
            </div>
            <div>
              <Label>{t.phone}</Label>
              <Input maxLength={40} value={v.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>{t.employees}</Label>
              <Input maxLength={40} value={v.employees} onChange={(e) => set("employees", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t.problem}</Label>
            <Textarea rows={3} maxLength={1500} value={v.message} onChange={(e) => set("message", e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox checked={consent} onCheckedChange={(x) => setConsent(x === true)} className="mt-0.5" />
            <span>
              {t.contactConsent}
            </span>
          </label>
          <Button type="submit" className="w-full" disabled={busy || !consent}>
            {t.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

class SafeRender extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[prospect] render failed", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
