// Product Workspace terminology in EN / DE / RO.
//
// Workspace labels are translated by workspace *kind* (the last segment of the
// workspace route) so a new product reuses the existing vocabulary instead of
// adding 40 new strings. The canonical English labels live in
// `product-architecture.ts`; this file only localises them.

export type WsLang = "en" | "de" | "ro";

const KINDS = {
  overview: { en: "Overview", de: "Überblick", ro: "Prezentare generală" },
  operations: { en: "Operations", de: "Betrieb", ro: "Operațiuni" },
  "sop-library": { en: "SOP Library", de: "SOP-Bibliothek", ro: "Bibliotecă SOP" },
  procedures: { en: "Procedures", de: "Prozesse", ro: "Proceduri" },
  "team-knowledge": { en: "Team Knowledge", de: "Team-Wissen", ro: "Cunoștințe de echipă" },
  knowledge: { en: "Knowledge", de: "Wissen", ro: "Cunoștințe" },
  "stock-operations": { en: "Stock Operations", de: "Bestandsbetrieb", ro: "Operațiuni de stoc" },
  carriers: { en: "Carrier Knowledge", de: "Spediteur-Wissen", ro: "Cunoștințe transportatori" },
  policies: { en: "Policies & Procedures", de: "Richtlinien & Prozesse", ro: "Politici și proceduri" },
  training: { en: "Training", de: "Schulung", ro: "Instruire" },
  compliance: { en: "Compliance", de: "Compliance", ro: "Conformitate" },
  requests: { en: "Requests", de: "Anfragen", ro: "Solicitări" },
  incidents: { en: "Incidents", de: "Vorfälle", ro: "Incidente" },
  gaps: { en: "Knowledge Gaps", de: "Wissenslücken", ro: "Lacune de cunoștințe" },
  reports: { en: "Reports", de: "Berichte", ro: "Rapoarte" },
  intelligence: { en: "Intelligence", de: "Intelligence", ro: "Intelligence" },
  map: { en: "Map", de: "Karte", ro: "Hartă" },
  cmr: { en: "CMR", de: "CMR", ro: "CMR" },
  settings: { en: "Settings", de: "Einstellungen", ro: "Setări" },

} as const;

const PRODUCT_DOMAINS = {
  logistics: { en: "Logistics", de: "Logistik", ro: "Logistică" },
  transport: { en: "Transport", de: "Transport", ro: "Transport" },
  hr: { en: "HR", de: "HR", ro: "HR" },
  finance: { en: "Finance", de: "Finanzen", ro: "Finanțe" },
  inventory: { en: "Inventory", de: "Bestand", ro: "Inventar" },
  operations: { en: "Operations", de: "Betrieb", ro: "Operațiuni" },
} as const;

/** Localised workspace label, derived from its route kind. */
export function localizeWorkspaceLabel(
  route: string | undefined,
  fallback: string,
  lang: WsLang,
): string {
  if (!route) return fallback;
  const parts = route.split("/");
  const kind = parts[parts.length - 1] as keyof typeof KINDS;
  const domain = parts[parts.length - 2] as keyof typeof PRODUCT_DOMAINS;
  const kindLabel = KINDS[kind]?.[lang];
  if (!kindLabel) return fallback;
  if (kind === "overview" || kind === "intelligence") {
    const d = PRODUCT_DOMAINS[domain]?.[lang];
    return d ? `${d} ${kindLabel}` : kindLabel;
  }
  return kindLabel;
}

export const WORKSPACE_UI = {
  en: {
    eyebrow: "Product workspace",
    workspaces: "Workspaces",
    coreInContext: "Core platform in this context",
    coreNote:
      "These are OPSQAI Core platform capabilities shown in a domain context. They remain part of every installation and stay governed by your roles and permissions.",
    open: "Open",
    noRouteYet: "Available inside the platform surfaces",
    notLicensedTitle: "Product not enabled",
    notLicensedBody:
      "This OPSQAI Product is not enabled for your installation. Enabled products are configured by OPSQAI and delivered through your license.",
    unknownTitle: "Workspace not found",
    unknownBody: "This product workspace does not exist.",
    backToLicense: "License & Entitlements",
    aiNote:
      "AI answers in this workspace stay grounded in your own company knowledge. The product only adds operational context — it never adds external knowledge.",
  },
  de: {
    eyebrow: "Produkt-Arbeitsbereich",
    workspaces: "Arbeitsbereiche",
    coreInContext: "Core-Plattform in diesem Kontext",
    coreNote:
      "Dies sind OPSQAI-Core-Funktionen in einem Domänenkontext. Sie sind Teil jeder Installation und bleiben durch Rollen und Berechtigungen geregelt.",
    open: "Öffnen",
    noRouteYet: "Innerhalb der Plattformbereiche verfügbar",
    notLicensedTitle: "Produkt nicht aktiviert",
    notLicensedBody:
      "Dieses OPSQAI-Produkt ist für Ihre Installation nicht aktiviert. Aktivierte Produkte werden von OPSQAI konfiguriert und über Ihre Lizenz ausgeliefert.",
    unknownTitle: "Arbeitsbereich nicht gefunden",
    unknownBody: "Dieser Produkt-Arbeitsbereich existiert nicht.",
    backToLicense: "Lizenz & Berechtigungen",
    aiNote:
      "KI-Antworten in diesem Arbeitsbereich bleiben in Ihrem eigenen Unternehmenswissen verankert. Das Produkt liefert nur den operativen Kontext — niemals externes Wissen.",
  },
  ro: {
    eyebrow: "Spațiu de lucru produs",
    workspaces: "Spații de lucru",
    coreInContext: "Platforma Core în acest context",
    coreNote:
      "Acestea sunt capabilități ale platformei OPSQAI Core prezentate într-un context de domeniu. Rămân parte din fiecare instalare și rămân guvernate de rolurile și permisiunile tale.",
    open: "Deschide",
    noRouteYet: "Disponibil în interiorul suprafețelor platformei",
    notLicensedTitle: "Produs neactivat",
    notLicensedBody:
      "Acest produs OPSQAI nu este activat pentru instalarea ta. Produsele activate sunt configurate de OPSQAI și livrate prin licență.",
    unknownTitle: "Spațiu de lucru inexistent",
    unknownBody: "Acest spațiu de lucru de produs nu există.",
    backToLicense: "Licență și drepturi",
    aiNote:
      "Răspunsurile AI din acest spațiu rămân ancorate în cunoștințele companiei tale. Produsul adaugă doar contextul operațional — niciodată cunoștințe externe.",
  },
} as const;
