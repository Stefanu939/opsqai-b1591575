import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { useT } from "@/i18n";

const COPY = {
  ro: {
    eyebrow: "Diagnostic operațional gratuit",
    headline: "Spune-ne unde pierde echipa timp.",
    accent: "Îți răspundem cu soluția.",
    body: "Descrie procesul cu cuvintele tale. Primești un diagnostic: fricțiunile, modulele OPSQAI potrivite, ce putem construi custom și un plan de pilot de 30 de zile.",
    name: "Nume și prenume", role: "Funcție", rolePh: "ex. Administrator, Șef atelier, Manager logistică",
    company: "Companie", email: "E-mail", phone: "Telefon (opțional)",
    message: "Descrie procesul / nevoia",
    messagePh: "Ce se face manual (hârtie, Excel, WhatsApp)? Unde apar erori sau întârzieri? Ce ai vrea să automatizezi?",
    send: "Trimite pentru diagnostic", sending: "Se trimite…",
    okTitle: "Mulțumim — am primit descrierea.", okBody: "Pregătim diagnosticul și revenim pe e-mail. Referință",
    kaiTitle: "Preferi să explici în conversație?",
    kaiBody: "Discută cu Kai: îți pune câteva întrebări și află exact unde se pierde timp în firma ta.",
    kai: "Vorbește cu Kai", err: "Nu am putut trimite. Încearcă din nou.",
  },
  en: {
    eyebrow: "Free operational diagnostic",
    headline: "Tell us where your team loses time.",
    accent: "We reply with the solution.",
    body: "Describe the process in your own words. You get a diagnostic: the friction points, matching OPSQAI modules, what we can build custom and a 30-day pilot plan.",
    name: "Full name", role: "Job title", rolePh: "e.g. Managing director, Workshop lead, Logistics manager",
    company: "Company", email: "Email", phone: "Phone (optional)",
    message: "Describe the process / need",
    messagePh: "What is done manually (paper, Excel, WhatsApp)? Where do errors or delays happen? What would you automate?",
    send: "Send for diagnostic", sending: "Sending…",
    okTitle: "Thank you — we received your description.", okBody: "We are preparing the diagnostic and will reply by email. Reference",
    kaiTitle: "Prefer to explain in a conversation?",
    kaiBody: "Talk to Kai: a few questions to find exactly where time is lost in your company.",
    kai: "Talk to Kai", err: "We couldn't send it. Please try again.",
  },
  de: {
    eyebrow: "Kostenlose Betriebsanalyse",
    headline: "Sagen Sie uns, wo Ihr Team Zeit verliert.",
    accent: "Wir antworten mit der Lösung.",
    body: "Beschreiben Sie den Ablauf in eigenen Worten. Sie erhalten eine Analyse: Reibungspunkte, passende OPSQAI-Module, individuelle Entwicklung und einen 30-Tage-Pilotplan.",
    name: "Vor- und Nachname", role: "Funktion", rolePh: "z. B. Geschäftsführer, Werkstattleiter, Logistikleiter",
    company: "Unternehmen", email: "E-Mail", phone: "Telefon (optional)",
    message: "Ablauf / Bedarf beschreiben",
    messagePh: "Was läuft manuell (Papier, Excel, WhatsApp)? Wo entstehen Fehler oder Verzögerungen? Was möchten Sie automatisieren?",
    send: "Zur Analyse senden", sending: "Wird gesendet…",
    okTitle: "Danke — wir haben Ihre Beschreibung erhalten.", okBody: "Wir erstellen die Analyse und melden uns per E-Mail. Referenz",
    kaiTitle: "Lieber im Gespräch erklären?",
    kaiBody: "Sprechen Sie mit Kai: ein paar Fragen, um genau zu finden, wo Zeit verloren geht.",
    kai: "Mit Kai sprechen", err: "Senden fehlgeschlagen. Bitte erneut versuchen.",
  },
} as const;

export const Route = createFileRoute("/diagnostic")({
  head: () => ({
    meta: [
      { title: "Diagnostic operațional gratuit — OPSQAI" },
      { name: "description", content: "Descrie procesul firmei tale și primești gratuit un diagnostic: fricțiuni, module OPSQAI potrivite, soluție custom și plan de pilot de 30 de zile." },
      { property: "og:title", content: "Diagnostic operațional gratuit — OPSQAI" },
      { property: "og:description", content: "Fricțiuni, module potrivite, soluție custom și plan de pilot — pornind de la procesul tău real." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://opsqai.de/diagnostic" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/diagnostic" }],
  }),
  component: DiagnosticPage,
});

const inputCls =
  "bg-[var(--oix-onyx)]/60 border-[var(--oix-gold-line)]/40 text-[var(--oix-cream)] placeholder:text-[var(--oix-cream)]/40 focus-visible:border-[var(--oix-gold)]/70 focus-visible:ring-0";

function DiagnosticPage() {
  const { lang } = useT();
  const t = COPY[(lang as keyof typeof COPY) in COPY ? (lang as keyof typeof COPY) : "ro"];
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    try {
      const res = await fetch("/api/public/contact-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "diagnostic", subject: "demo",
          name: g("name"), role: g("role"), company: g("company"), email: g("email"),
          phone: g("phone"), country: "", message: g("message"), website: g("website"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; referenceId?: string; error?: string };
      if (!res.ok || !json.ok) { toast.error(json.error ?? t.err); return; }
      setReference(json.referenceId ?? "—");
    } catch {
      toast.error(t.err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OixLayout>
      <section className="border-b border-[var(--oix-gold-line)]/40">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-32 md:px-10 md:pt-40">
          <EditorialHeadline as="h1" size="xl" eyebrow={t.eyebrow} serifAccent={t.accent}>
            {t.headline}
          </EditorialHeadline>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--oix-cream)]/75">{t.body}</p>
        </div>
      </section>
      <SectionShell>
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="p-6 md:col-span-2 md:p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
            {reference ? (
              <div>
                <CheckCircle2 className="h-8 w-8 text-[var(--oix-gold)]" />
                <div className="oix-display mt-4 text-2xl text-[var(--oix-cream)]">{t.okTitle}</div>
                <p className="mt-3 text-[var(--oix-cream)]/70">
                  {t.okBody} <span className="font-mono text-[var(--oix-gold)]">{reference}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field id="name" label={t.name}><Input id="name" name="name" required autoComplete="name" className={inputCls} /></Field>
                  <Field id="role" label={t.role}><Input id="role" name="role" required placeholder={t.rolePh} className={inputCls} /></Field>
                  <Field id="company" label={t.company}><Input id="company" name="company" autoComplete="organization" className={inputCls} /></Field>
                  <Field id="email" label={t.email}><Input id="email" name="email" type="email" required autoComplete="email" className={inputCls} /></Field>
                  <Field id="phone" label={t.phone}><Input id="phone" name="phone" type="tel" autoComplete="tel" className={inputCls} /></Field>
                </div>
                <Field id="message" label={t.message}>
                  <textarea
                    id="message" name="message" rows={7} required minLength={10} placeholder={t.messagePh}
                    className="flex min-h-[180px] w-full border border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 px-3 py-2.5 text-sm text-[var(--oix-cream)] placeholder:text-[var(--oix-cream)]/40 focus-visible:outline-none focus-visible:border-[var(--oix-gold)]/70"
                  />
                </Field>
                <div className="hidden" aria-hidden="true"><input name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
                <OixButton variant="gold" withArrow disabled={submitting} type="submit">
                  {submitting ? t.sending : t.send}
                </OixButton>
              </form>
            )}
          </Card>
          <Card className="h-fit p-6 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
            <MessageCircle className="h-6 w-6 text-[var(--oix-gold)]" />
            <div className="mt-4 font-semibold text-[var(--oix-cream)]">{t.kaiTitle}</div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--oix-cream)]/70">{t.kaiBody}</p>
            <div className="mt-5"><OixButton to="/kai" variant="ghost">{t.kai}</OixButton></div>
          </Card>
        </div>
      </SectionShell>
    </OixLayout>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="oix-eyebrow text-[10px]">{label}</Label>
      {children}
    </div>
  );
}
