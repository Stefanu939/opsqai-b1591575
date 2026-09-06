// Copy for the public resources page (/resources) — free lead magnets.
import { useT } from "@/i18n";

export const RESOURCE_SLUGS = [
  "sop-30-day-checklist",
  "knowledge-tco-calculator",
  "knowledge-audit-template",
] as const;
export type ResourceSlug = (typeof RESOURCE_SLUGS)[number];

interface ResourcesCopy {
  meta: { title: string; description: string };
  hero: { eyebrow: string; headline: string; serifAccent: string; body: string };
  items: Record<ResourceSlug, { kind: string; title: string; body: string; bullets: string[] }>;
  form: {
    eyebrow: string;
    title: string;
    body: string;
    nameLabel: string;
    emailLabel: string;
    companyLabel: string;
    submit: string;
    submitting: string;
    consent: string;
    privacy: string;
    successTitle: string;
    successBody: string;
    download: string;
    another: string;
    errorGeneric: string;
    errorNetwork: string;
    pick: string;
  };
  cta: { title: string; body: string; pilot: string; demo: string };
}

export const resourcesCopyEn: ResourcesCopy = {
  meta: {
    title: "Free Resources — OPSQAI · SOP Checklist, Knowledge Cost Model, Audit Template",
    description:
      "Three free downloads for operations leaders: a 30-day SOP digitisation checklist, a cost model for lost operational knowledge, and a 20-question knowledge audit template.",
  },
  hero: {
    eyebrow: "Free resources",
    headline: "Three tools you can use",
    serifAccent: "before you buy anything.",
    body: "Practical documents built from real operational work in logistics, HR, finance and transport. No account needed — just an email address so we can send the file.",
  },
  items: {
    "sop-30-day-checklist": {
      kind: "Checklist · PDF",
      title: "30 days to digitise your procedures",
      body: "A week-by-week plan any operations team can run without consultants.",
      bullets: [
        "Week 1: inventory and ownership",
        "Week 2: one page per critical process",
        "Week 3: make answers findable",
        "Week 4: reviews, gaps and acknowledgements",
      ],
    },
    "knowledge-tco-calculator": {
      kind: "Cost model · PDF",
      title: "What lost knowledge actually costs",
      body: "A worksheet that turns searching, asking and rework into a number finance accepts.",
      bullets: [
        "Search and interruption cost formulas",
        "Onboarding and rework inputs",
        "Worked example with real rates",
        "Payback comparison in months",
      ],
    },
    "knowledge-audit-template": {
      kind: "Template · PDF",
      title: "Operational knowledge audit — 20 questions",
      body: "Score coverage, freshness, access control and your learning loop from 0 to 5.",
      bullets: [
        "20 questions in four sections",
        "Scoring guidance for management teams",
        "Highlights the risks worth fixing first",
        "Works with or without OPSQAI",
      ],
    },
  },
  form: {
    eyebrow: "Get the files",
    title: "Where should we send it?",
    body: "Pick a document, enter your email and the download appears immediately.",
    nameLabel: "Name",
    emailLabel: "Work email",
    companyLabel: "Company",
    submit: "Get the download",
    submitting: "Sending…",
    consent: "By downloading you agree to our",
    privacy: "privacy policy",
    successTitle: "Your download is ready",
    successBody: "We also logged your request under reference",
    download: "Download PDF",
    another: "Get another document",
    errorGeneric: "We could not process the request. Please try again.",
    errorNetwork: "Network error. Please try again.",
    pick: "Document",
  },
  cta: {
    title: "Prefer to see it working?",
    body: "Run OPSQAI on your own Windows Server for 30 days, or take a 30-minute walkthrough with us first.",
    pilot: "Start free 30-day pilot",
    demo: "Book a demo",
  },
};

const de: ResourcesCopy = {
  meta: {
    title: "Kostenlose Ressourcen — OPSQAI · Checkliste, Kostenmodell, Audit-Vorlage",
    description:
      "Drei kostenlose Downloads für Operations-Verantwortliche: 30-Tage-Checkliste zur Digitalisierung von Anweisungen, Kostenmodell für verlorenes Wissen und Audit-Vorlage mit 20 Fragen.",
  },
  hero: {
    eyebrow: "Kostenlose Ressourcen",
    headline: "Drei Werkzeuge, nutzbar",
    serifAccent: "vor jedem Kauf.",
    body: "Praxisdokumente aus echter operativer Arbeit in Logistik, HR, Finanzen und Transport. Kein Konto nötig — nur eine E-Mail-Adresse für den Versand.",
  },
  items: {
    "sop-30-day-checklist": {
      kind: "Checkliste · PDF",
      title: "30 Tage bis zur Digitalisierung Ihrer Anweisungen",
      body: "Ein Wochenplan, den jedes Operations-Team ohne Berater umsetzen kann.",
      bullets: [
        "Woche 1: Inventar und Verantwortung",
        "Woche 2: eine Seite pro kritischem Prozess",
        "Woche 3: Antworten findbar machen",
        "Woche 4: Prüfungen, Lücken, Bestätigungen",
      ],
    },
    "knowledge-tco-calculator": {
      kind: "Kostenmodell · PDF",
      title: "Was verlorenes Wissen tatsächlich kostet",
      body: "Ein Arbeitsblatt, das Suchen, Nachfragen und Nacharbeit in eine belastbare Zahl übersetzt.",
      bullets: [
        "Formeln für Such- und Unterbrechungskosten",
        "Eingaben für Einarbeitung und Nacharbeit",
        "Rechenbeispiel mit realen Sätzen",
        "Amortisation in Monaten",
      ],
    },
    "knowledge-audit-template": {
      kind: "Vorlage · PDF",
      title: "Audit des operativen Wissens — 20 Fragen",
      body: "Bewerten Sie Abdeckung, Aktualität, Zugriffskontrolle und Lernschleife von 0 bis 5.",
      bullets: [
        "20 Fragen in vier Abschnitten",
        "Bewertungshilfe für Führungsteams",
        "Zeigt die zuerst zu behebenden Risiken",
        "Funktioniert mit und ohne OPSQAI",
      ],
    },
  },
  form: {
    eyebrow: "Dateien erhalten",
    title: "Wohin sollen wir es senden?",
    body: "Dokument wählen, E-Mail eingeben — der Download erscheint sofort.",
    nameLabel: "Name",
    emailLabel: "Geschäftliche E-Mail",
    companyLabel: "Unternehmen",
    submit: "Download erhalten",
    submitting: "Wird gesendet…",
    consent: "Mit dem Download stimmen Sie unserer",
    privacy: "Datenschutzerklärung",
    successTitle: "Ihr Download ist bereit",
    successBody: "Wir haben Ihre Anfrage unter der Referenz erfasst",
    download: "PDF herunterladen",
    another: "Weiteres Dokument erhalten",
    errorGeneric: "Die Anfrage konnte nicht verarbeitet werden. Bitte erneut versuchen.",
    errorNetwork: "Netzwerkfehler. Bitte erneut versuchen.",
    pick: "Dokument",
  },
  cta: {
    title: "Lieber live sehen?",
    body: "Betreiben Sie OPSQAI 30 Tage auf Ihrem eigenen Windows Server oder starten Sie mit einem 30-minütigen Rundgang.",
    pilot: "Kostenlosen 30-Tage-Pilot starten",
    demo: "Demo buchen",
  },
};

const ro: ResourcesCopy = {
  meta: {
    title: "Resurse gratuite — OPSQAI · Checklist SOP, model de cost, șablon de audit",
    description:
      "Trei descărcări gratuite pentru manageri de operațiuni: checklist de 30 de zile pentru digitizarea procedurilor, model de cost al cunoștințelor pierdute și șablon de audit cu 20 de întrebări.",
  },
  hero: {
    eyebrow: "Resurse gratuite",
    headline: "Trei instrumente pe care",
    serifAccent: "le folosești înainte să cumperi.",
    body: "Documente practice, construite din muncă operațională reală în logistică, HR, finanțe și transport. Nu ai nevoie de cont — doar o adresă de e-mail ca să trimitem fișierul.",
  },
  items: {
    "sop-30-day-checklist": {
      kind: "Checklist · PDF",
      title: "30 de zile pentru digitizarea procedurilor",
      body: "Un plan săptămânal pe care orice echipă de operațiuni îl rulează fără consultanți.",
      bullets: [
        "Săptămâna 1: inventar și responsabili",
        "Săptămâna 2: o pagină per proces critic",
        "Săptămâna 3: răspunsuri ușor de găsit",
        "Săptămâna 4: revizuiri, lipsuri, confirmări",
      ],
    },
    "knowledge-tco-calculator": {
      kind: "Model de cost · PDF",
      title: "Cât te costă, de fapt, cunoștințele pierdute",
      body: "O foaie de lucru care transformă căutarea, întrebările și munca refăcută într-o cifră acceptată de financiar.",
      bullets: [
        "Formule pentru costul căutării și al întreruperii",
        "Date pentru integrare și refacere",
        "Exemplu calculat cu tarife reale",
        "Comparație de amortizare în luni",
      ],
    },
    "knowledge-audit-template": {
      kind: "Șablon · PDF",
      title: "Audit de cunoștințe operaționale — 20 de întrebări",
      body: "Notează acoperirea, actualitatea, controlul accesului și bucla de învățare, de la 0 la 5.",
      bullets: [
        "20 de întrebări în patru secțiuni",
        "Ghid de notare pentru echipa de management",
        "Arată riscurile care merită rezolvate primele",
        "Funcționează cu sau fără OPSQAI",
      ],
    },
  },
  form: {
    eyebrow: "Primește fișierele",
    title: "Unde să îl trimitem?",
    body: "Alege documentul, introdu e-mailul și descărcarea apare imediat.",
    nameLabel: "Nume",
    emailLabel: "E-mail de lucru",
    companyLabel: "Companie",
    submit: "Primește descărcarea",
    submitting: "Se trimite…",
    consent: "Prin descărcare accepți",
    privacy: "politica de confidențialitate",
    successTitle: "Descărcarea este pregătită",
    successBody: "Am înregistrat cererea cu referința",
    download: "Descarcă PDF",
    another: "Primește alt document",
    errorGeneric: "Nu am putut procesa cererea. Te rugăm să încerci din nou.",
    errorNetwork: "Eroare de rețea. Te rugăm să încerci din nou.",
    pick: "Document",
  },
  cta: {
    title: "Preferi să vezi produsul la lucru?",
    body: "Rulează OPSQAI 30 de zile pe serverul tău Windows sau începe cu o prezentare de 30 de minute.",
    pilot: "Începe pilotul gratuit de 30 de zile",
    demo: "Programează un demo",
  },
};

export function useResourcesCopy(): ResourcesCopy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : resourcesCopyEn;
}
