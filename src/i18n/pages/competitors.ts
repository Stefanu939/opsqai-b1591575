// Dedicated "OPSQAI vs X" comparison pages. Fair and architectural: we only
// state well-known, structural differences (where data lives, pricing model,
// deployment) — no invented benchmarks, no claims about competitor internals.
import { useT } from "@/i18n";

export const COMPETITOR_SLUGS = ["chatgpt", "copilot", "confluence-notion", "perplexity", "cloud-saas"] as const;
export type CompetitorSlug = (typeof COMPETITOR_SLUGS)[number];

type L = { en: string; de: string; ro: string };
type Row = { topic: L; them: L; us: L };

export const COMPETITOR_NAMES: Record<CompetitorSlug, string> = {
  chatgpt: "ChatGPT Enterprise",
  copilot: "Microsoft 365 Copilot",
  "confluence-notion": "Confluence & Notion AI",
  perplexity: "Perplexity Enterprise",
  "cloud-saas": "Cloud SaaS",
};

const rowData: Row = {
  topic: { en: "Where your data lives", de: "Wo Ihre Daten liegen", ro: "Unde stau datele" },
  them: {
    en: "In the vendor's cloud, under the vendor's infrastructure and contracts.",
    de: "In der Cloud des Anbieters, unter dessen Infrastruktur und Verträgen.",
    ro: "În cloud-ul furnizorului, pe infrastructura și contractele acestuia.",
  },
  us: {
    en: "On your own Windows server, inside your company network. You are the Data Controller.",
    de: "Auf Ihrem eigenen Windows-Server, im Firmennetz. Sie sind der Verantwortliche.",
    ro: "Pe serverul dumneavoastră Windows, în rețeaua firmei. Dumneavoastră sunteți operatorul de date.",
  },
};
const rowCost: Row = {
  topic: { en: "Cost model", de: "Kostenmodell", ro: "Model de cost" },
  them: {
    en: "Subscription per user, per month — grows with every hire.",
    de: "Abo pro Nutzer und Monat — wächst mit jeder Einstellung.",
    ro: "Abonament per utilizator, lunar — crește cu fiecare angajare.",
  },
  us: {
    en: "One-time Core license, products you enable, predictable annual maintenance. No seat tax.",
    de: "Einmalige Core-Lizenz, aktivierte Produkte, planbare Wartung. Keine Pro-Kopf-Gebühr.",
    ro: "Licență Core unică, produse activate după nevoie, mentenanță anuală previzibilă. Fără taxă per angajat.",
  },
};
const rowGrounding: Row = {
  topic: { en: "Answers", de: "Antworten", ro: "Răspunsuri" },
  them: {
    en: "General-purpose assistant; company grounding depends on configuration and connectors.",
    de: "Allzweck-Assistent; Firmenbezug hängt von Konfiguration und Konnektoren ab.",
    ro: "Asistent general; legătura cu documentele firmei depinde de configurare și conectori.",
  },
  us: {
    en: "Answers only from your approved documents and FAQs, with the source. If it is not documented, it says so.",
    de: "Antworten nur aus freigegebenen Dokumenten und FAQs, mit Quelle. Was nicht dokumentiert ist, wird so benannt.",
    ro: "Răspunde doar din documentele și FAQ-urile aprobate, cu sursa. Dacă nu e documentat, spune asta.",
  },
};
const rowOps: Row = {
  topic: { en: "Beyond chat", de: "Mehr als Chat", ro: "Dincolo de chat" },
  them: {
    en: "Focused on its own product scope; training, HR or fleet workflows need other tools.",
    de: "Fokus auf den eigenen Produktumfang; Schulung, HR oder Fuhrpark brauchen weitere Tools.",
    ro: "Concentrat pe propriul produs; instruirea, HR sau flota cer alte aplicații.",
  },
  us: {
    en: "Academy with quizzes and certificates, SOP versioning, audit trail, HR and Transport workspaces.",
    de: "Academy mit Quiz und Zertifikaten, SOP-Versionierung, Audit-Trail, HR- und Transport-Bereiche.",
    ro: "Academie cu teste și certificate, versionare SOP, jurnal de audit, spații HR și Transport.",
  },
};
const rowOffline: Row = {
  topic: { en: "Internet dependency", de: "Internet-Abhängigkeit", ro: "Dependență de internet" },
  them: {
    en: "Requires a connection to the vendor's service for every request.",
    de: "Jede Anfrage braucht eine Verbindung zum Dienst des Anbieters.",
    ro: "Fiecare cerere are nevoie de conexiune la serviciul furnizorului.",
  },
  us: {
    en: "AI can run locally on your server — daily work continues even without internet.",
    de: "KI kann lokal auf Ihrem Server laufen — der Alltag läuft auch ohne Internet.",
    ro: "AI-ul poate rula local pe server — munca zilnică continuă și fără internet.",
  },
};

const intros: Record<CompetitorSlug, L> = {
  chatgpt: {
    en: "ChatGPT Enterprise is an excellent general assistant. OPSQAI is built for something narrower: answers from your own documents, on your own server.",
    de: "ChatGPT Enterprise ist ein hervorragender Allzweck-Assistent. OPSQAI ist für etwas Engeres gebaut: Antworten aus Ihren Dokumenten, auf Ihrem Server.",
    ro: "ChatGPT Enterprise este un asistent general excelent. OPSQAI e construit pentru ceva mai precis: răspunsuri din documentele firmei, pe serverul firmei.",
  },
  copilot: {
    en: "Microsoft 365 Copilot lives inside Office and Microsoft's cloud. OPSQAI lives inside your company — and works with or without Microsoft 365.",
    de: "Microsoft 365 Copilot lebt in Office und der Microsoft-Cloud. OPSQAI lebt in Ihrem Unternehmen — mit oder ohne Microsoft 365.",
    ro: "Microsoft 365 Copilot trăiește în Office și în cloud-ul Microsoft. OPSQAI trăiește în firma dumneavoastră — cu sau fără Microsoft 365.",
  },
  "confluence-notion": {
    en: "Confluence and Notion are great places to write documentation. OPSQAI turns documentation into answers, training and audit evidence — on-premise.",
    de: "Confluence und Notion sind gute Orte zum Dokumentieren. OPSQAI macht daraus Antworten, Schulungen und Audit-Nachweise — on-premise.",
    ro: "Confluence și Notion sunt locuri bune pentru a scrie documentație. OPSQAI o transformă în răspunsuri, instruire și dovezi de audit — local.",
  },
  perplexity: {
    en: "Perplexity searches the web brilliantly. OPSQAI deliberately does not: it answers from your internal knowledge only.",
    de: "Perplexity durchsucht das Web brillant. OPSQAI bewusst nicht: Es antwortet nur aus Ihrem internen Wissen.",
    ro: "Perplexity caută excelent pe internet. OPSQAI, intenționat, nu: răspunde doar din cunoștințele interne ale firmei.",
  },
  "cloud-saas": {
    en: "Typical cloud SaaS tools rent you software per seat, per month. OPSQAI installs on your server, once, and stays yours.",
    de: "Typische Cloud-SaaS vermietet Software pro Platz und Monat. OPSQAI wird einmal auf Ihrem Server installiert und bleibt Ihres.",
    ro: "Aplicațiile cloud SaaS obișnuite închiriază software per utilizator, lunar. OPSQAI se instalează o dată pe serverul firmei și rămâne al dumneavoastră.",
  },
};

const ui = {
  en: { eyebrow: "Comparison", vs: "OPSQAI vs", them: "", us: "OPSQAI Self-Hosted", fair: "Fair note: we compare architecture and business model, not benchmarks. Features of other products change often — check the vendor's current offer.", cta: "Start the free 30-day pilot", all: "All comparisons" },
  de: { eyebrow: "Vergleich", vs: "OPSQAI vs", them: "", us: "OPSQAI Self-Hosted", fair: "Fairer Hinweis: Wir vergleichen Architektur und Geschäftsmodell, keine Benchmarks. Funktionen anderer Produkte ändern sich oft — prüfen Sie das aktuelle Angebot.", cta: "Kostenlosen 30-Tage-Pilot starten", all: "Alle Vergleiche" },
  ro: { eyebrow: "Comparație", vs: "OPSQAI vs", them: "", us: "OPSQAI Self-Hosted", fair: "Notă corectă: comparăm arhitectura și modelul de business, nu teste de performanță. Funcțiile altor produse se schimbă des — verificați oferta actuală a furnizorului.", cta: "Începeți pilotul gratuit de 30 de zile", all: "Toate comparațiile" },
};

export function getCompetitorCopy(slug: CompetitorSlug, lang: "en" | "de" | "ro") {
  const rows = [rowData, rowCost, rowGrounding, rowOps, rowOffline].map((r) => ({
    topic: r.topic[lang],
    them: r.them[lang],
    us: r.us[lang],
  }));
  return { name: COMPETITOR_NAMES[slug], intro: intros[slug][lang], rows, ui: ui[lang] };
}

export function useCompetitorCopy(slug: CompetitorSlug) {
  const { lang } = useT();
  return getCompetitorCopy(slug, lang === "de" ? "de" : lang === "ro" ? "ro" : "en");
}

export function competitorMeta(slug: CompetitorSlug) {
  const c = getCompetitorCopy(slug, "en");
  return {
    title: `OPSQAI vs ${c.name} — self-hosted AI comparison`,
    description: c.intro,
  };
}
