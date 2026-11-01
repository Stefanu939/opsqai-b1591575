import { Users, LayoutDashboard, Boxes, UserCog, FileText, Wrench } from "lucide-react";
import { useT } from "@/i18n";
import { SectionShell } from "./section-shell";
import { EditorialHeadline } from "./editorial-headline";
import { OixButton } from "./buttons";

const ICONS = [Users, LayoutDashboard, Boxes, UserCog, FileText, Wrench];

const COPY = {
  ro: {
    eyebrow: "Module custom",
    headline: "Construim exact ce îi lipsește firmei tale.",
    accent: "Exemple",
    body: "Pe lângă modulele standard, dezvoltăm module la comandă, la cost fix, care rulează pe serverul tău local. Câteva exemple:",
    items: [
      ["CRM", "Clienți, oferte, istoric discuții și follow-up automat, într-un singur loc."],
      ["Management Center", "Panou central pentru conducere: indicatori, aprobări, alerte și rapoarte."],
      ["Gestiune marfă", "Stocuri, loturi, intrări/ieșiri, CMR-uri și trasabilitate pe depozite."],
      ["Angajați și clienți", "Fișe angajați, ture, concedii, documente și evidența clienților."],
      ["Facturi", "Emitere, urmărire încasări, reconciliere și remindere de plată."],
      ["Orice flux al tău", "Devize service, fișe de lucru, proceduri interne — pornind de la procesul real."],
    ],
    cta: "Cere un diagnostic gratuit",
    secondary: "Calculează pierderile",
  },
  en: {
    eyebrow: "Custom modules",
    headline: "We build exactly what your company is missing.",
    accent: "Examples",
    body: "Beyond the standard modules, we develop custom modules at a fixed price, running on your local server. A few examples:",
    items: [
      ["CRM", "Customers, quotes, conversation history and automatic follow-up in one place."],
      ["Management Center", "Central cockpit for leadership: KPIs, approvals, alerts and reports."],
      ["Inventory management", "Stock, batches, goods in/out, CMRs and warehouse traceability."],
      ["Employees & customers", "Employee records, shifts, leave, documents and customer records."],
      ["Invoicing", "Issuing, payment tracking, reconciliation and payment reminders."],
      ["Any workflow of yours", "Service quotes, job cards, internal procedures — built from your real process."],
    ],
    cta: "Request a free diagnostic",
    secondary: "Estimate your losses",
  },
  de: {
    eyebrow: "Individuelle Module",
    headline: "Wir bauen genau das, was Ihrem Unternehmen fehlt.",
    accent: "Beispiele",
    body: "Neben den Standardmodulen entwickeln wir individuelle Module zum Festpreis, die auf Ihrem lokalen Server laufen. Einige Beispiele:",
    items: [
      ["CRM", "Kunden, Angebote, Gesprächsverlauf und automatisches Follow-up an einem Ort."],
      ["Management Center", "Zentrales Cockpit für die Leitung: Kennzahlen, Freigaben, Alarme, Berichte."],
      ["Warenwirtschaft", "Bestände, Chargen, Warenein-/ausgang, CMR und Rückverfolgbarkeit."],
      ["Mitarbeiter & Kunden", "Personalakten, Schichten, Urlaub, Dokumente und Kundenverwaltung."],
      ["Rechnungen", "Ausstellung, Zahlungsverfolgung, Abgleich und Zahlungserinnerungen."],
      ["Jeder eigene Ablauf", "Werkstattangebote, Arbeitskarten, interne Verfahren — aus Ihrem echten Prozess."],
    ],
    cta: "Kostenlose Analyse anfragen",
    secondary: "Verluste berechnen",
  },
} as const;

export function CustomModuleExamples() {
  const { lang } = useT();
  const t = COPY[(lang as keyof typeof COPY) in COPY ? (lang as keyof typeof COPY) : "ro"];
  return (
    <SectionShell>
      <EditorialHeadline eyebrow={t.eyebrow} serifAccent={t.accent}>
        {t.headline}
      </EditorialHeadline>
      <p className="mt-6 max-w-2xl text-[var(--oix-cream)]/75">{t.body}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.items.map(([title, desc], i) => {
          const Icon = ICONS[i];
          return (
            <div key={title} className="rounded-xl border border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 p-6">
              <Icon className="h-5 w-5 text-[var(--oix-gold)]" />
              <div className="mt-4 font-semibold text-[var(--oix-cream)]">{title}</div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--oix-cream)]/70">{desc}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <OixButton to="/contact?subject=custom" variant="gold" withArrow>{t.cta}</OixButton>
        <OixButton to="/calculator" variant="ghost">{t.secondary}</OixButton>
      </div>
    </SectionShell>
  );
}
