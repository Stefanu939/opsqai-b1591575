import { createFileRoute } from "@tanstack/react-router";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Sparkles, UserPlus, CheckCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { setCloudAudience } from "@/lib/cloud-access";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { askPortalKai } from "@/lib/portal-kai.functions";
import { getProspectStatus, registerProspect, submitProspectLead } from "@/lib/prospect.functions";
import { KaiRichMessage } from "@/components/kai/kai-rich-message";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/prospect")({
  head: () => ({
    meta: [
      { title: "Discută cu Kai — OPSQAI Prospect Mode" },
      { name: "description", content: "Află cum te poate ajuta OPSQAI, direct de la Kai, asistentul AI. Pilot gratuit 30 de zile." },
      { property: "og:title", content: "Discută cu Kai — OPSQAI" },
      { property: "og:description", content: "Întreabă-l pe Kai despre OPSQAI pentru firma ta și cere un pilot gratuit de 30 de zile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProspectPage,
});

const CONSENT_KEY = "opsqai.prospect.consent";
const FORM_TOKEN = "[[CONTACT_FORM]]";
type Msg = { role: "user" | "assistant"; content: string };

function ProspectPage() {
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
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="font-display font-semibold">OPSQAI</span>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
            Prospect Mode
          </span>
        </div>
        {user && (
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Ieșire
          </Button>
        )}
      </header>
      {user ? (
        <ProspectChat />
      ) : (
        <ProspectSignIn />
      )}
    </div>
  );
}

function ProspectSignIn() {
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
          options: { emailRedirectTo: `${window.location.origin}/prospect` },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "A apărut o eroare");
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    remember();
    await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/prospect` });
  };

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-10 md:grid-cols-2 md:items-center">
      <section>
        <div className="mb-3 inline-flex items-center gap-2 text-sm text-primary">
          <Sparkles className="h-4 w-4" /> Kai, asistentul AI OPSQAI
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Află în 5 minute ce poate face OPSQAI pentru firma ta.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Spune-i lui Kai cum lucrați. Îți arată ce module se potrivesc, un calcul estimativ de timp
          economisit și cum arată pilotul gratuit de 30 de zile. Fără formulare lungi, fără prețuri
          ascunse în text mic.
        </p>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        {sent ? (
          <div className="space-y-2 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
            <p className="font-semibold">Verifică emailul</p>
            <p className="text-sm text-muted-foreground">
              Ți-am trimis un link de confirmare la {email}. După confirmare, revii direct la Kai.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h2 className="font-display text-lg font-semibold">
              {mode === "signup" ? "Creează cont gratuit" : "Intră în cont"}
            </h2>
            <Button type="button" variant="outline" className="w-full" onClick={google}>
              Continuă cu Google
            </Button>
            <div className="text-center text-xs text-muted-foreground">sau cu orice adresă de email</div>
            <div>
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="p-pass">Parolă</Label>
              <Input id="p-pass" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>
                Sunt de acord ca OPSQAI să folosească datele contului și conversațiile cu Kai pentru a
                mă contacta cu informații despre produs. Opțional — poți folosi Kai și fără acord.
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signup" ? "Creează cont și vorbește cu Kai" : "Intră"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-primary"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Ai deja cont? Intră" : "Nu ai cont? Creează unul"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function ProspectChat() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["prospect-status"], queryFn: () => getProspectStatus() });
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Bună! Sunt **Kai**, asistentul OPSQAI. 👋\n\nSpune-mi pe scurt: cu ce se ocupă firma ta și câți oameni lucrează acolo? Îți arăt ce te-ar putea ajuta concret.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const registeredRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!status.data || status.data.isProspect || status.data.hasCompany || registeredRef.current) return;
    registeredRef.current = true;
    let consent = false;
    try { consent = localStorage.getItem(CONSENT_KEY) === "1"; } catch { /* optional storage */ }
    void registerProspect({ data: { dataConsent: consent } }).then(() =>
      qc.invalidateQueries({ queryKey: ["prospect-status"] }),
    ).catch(() => { /* Chat and contact form remain available if registration fails. */ });
  }, [status.data, qc]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, chatError]);

  const send = async () => {
    const text = input.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setChatError(null);
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const r = await askPortalKai({ data: { messages: next.slice(-20), mode: "prospect" } });
      if (!r.ok || typeof r.text !== "string" || !r.text.trim()) {
        setChatError("Kai nu poate răspunde momentan. Conversația rămâne aici; poți solicita contactul echipei OPSQAI.");
        return;
      }
      setMsgs([...next, { role: "assistant", content: r.text }]);
    } catch (err) {
      console.error("[prospect] send failed", err);
      setChatError("Nu am putut primi răspunsul lui Kai. Conversația rămâne aici; poți solicita contactul echipei OPSQAI.");
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  };

  const submitted = status.data?.submitted;
  const lastIdx = msgs.length - 1;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <div className="flex items-center justify-between gap-2 py-3">
        <p className="text-sm text-muted-foreground">Întreabă orice despre OPSQAI.</p>
        <Button size="sm" onClick={() => setFormOpen(true)} disabled={submitted}>
          <UserPlus className="mr-1 h-4 w-4" />
          {submitted ? "Cerere trimisă" : "Solicită pilot gratuit"}
        </Button>
      </div>
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {msgs.map((m, i) => {
          const hasForm = m.content.includes(FORM_TOKEN);
          const content = m.content.replace(FORM_TOKEN, "").trim();
          return m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-xl bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
              {content}
            </div>
          ) : (
            <div key={i} className="max-w-[92%] break-words rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm">
              <SafeRender fallback={<p className="whitespace-pre-wrap">{content}</p>}>
                <KaiRichMessage content={content} />
              </SafeRender>
              {hasForm && i === lastIdx && !submitted && (
                <Button size="sm" className="mt-3" onClick={() => setFormOpen(true)}>
                  <UserPlus className="mr-1 h-4 w-4" /> Completează datele de contact
                </Button>
              )}
            </div>
          );
        })}
        {busy && <div className="text-sm text-muted-foreground">Kai scrie…</div>}
        {chatError && (
          <div role="alert" className="border-l-2 border-destructive py-2 pl-3 text-sm text-muted-foreground">
            <p>{chatError}</p>
            {!submitted && (
              <Button variant="link" size="sm" className="mt-1 px-0" onClick={() => setFormOpen(true)}>
                <UserPlus className="mr-1 h-4 w-4" /> Solicită contact
              </Button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="sticky bottom-0 flex gap-2 border-t border-border bg-background py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input value={input} maxLength={4000} aria-label="Mesaj pentru Kai" onChange={(e) => setInput(e.target.value)} placeholder="Scrie un mesaj pentru Kai…" />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Trimite">
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <ContactDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transcript={msgs.slice(1).map((m) => ({ ...m, content: m.content.replace(FORM_TOKEN, "").slice(0, 4000) })).slice(-40)}
        onDone={() => qc.invalidateQueries({ queryKey: ["prospect-status"] })}
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
  onDone: () => void;
}) {
  const [v, setV] = useState({ full_name: "", company_name: "", phone: "", employees: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v, x: string) => setV((p) => ({ ...p, [k]: x }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setBusy(true);
    try {
      await submitProspectLead({ data: { ...v, consent_contact: true, transcript } });
      toast.success("Mulțumim! Un specialist din echipa OPSQAI te va contacta.");
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nu am putut trimite cererea");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicită pilotul gratuit de 30 de zile</DialogTitle>
          <DialogDescription>Completează datele și un specialist din echipa OPSQAI te contactează.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nume și prenume *</Label>
              <Input required minLength={2} maxLength={120} value={v.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div>
              <Label>Firmă *</Label>
              <Input required minLength={2} maxLength={160} value={v.company_name} onChange={(e) => set("company_name", e.target.value)} />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input maxLength={40} value={v.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Număr angajați</Label>
              <Input maxLength={40} value={v.employees} onChange={(e) => set("employees", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Ce ai vrea să rezolvi?</Label>
            <Textarea rows={3} maxLength={1500} value={v.message} onChange={(e) => set("message", e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox checked={consent} onCheckedChange={(x) => setConsent(x === true)} className="mt-0.5" />
            <span>
              Sunt de acord să fiu contactat de echipa OPSQAI (email/telefon) în legătură cu această
              cerere. Pot retrage acordul oricând.
            </span>
          </label>
          <Button type="submit" className="w-full" disabled={busy || !consent}>
            Trimite cererea
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
