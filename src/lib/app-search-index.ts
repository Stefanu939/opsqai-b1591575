// OPSQAI in-app feature index — client-safe.
//
// The global search must find *anything inside the application*: not only
// content (documents, FAQs, people) but also the screens and functions
// themselves. This registry lists every navigable surface with localized
// labels and search keywords so "concediu", "vacation" or "CMR" all lead to
// the right place, in any of the three UI languages.

import { PRODUCT_WORKSPACES } from "@/lib/product-architecture";

export type Lang = "en" | "de" | "ro";

export interface FeatureEntry {
  /** Router path. Product workspaces use the canonical /app/products/... shape. */
  to: string;
  /** Group heading key, translated in the search UI. */
  group: "core" | "transport" | "hr" | "academy" | "admin";
  label: Record<Lang, string>;
  /** Extra words matched against the query (any language, lower-case). */
  keywords: string[];
}

const f = (
  to: string,
  group: FeatureEntry["group"],
  en: string,
  de: string,
  ro: string,
  keywords: string[] = [],
): FeatureEntry => ({ to, group, label: { en, de, ro }, keywords });

export const APP_FEATURES: FeatureEntry[] = [
  // ── Core ────────────────────────────────────────────────────────────
  f("/app", "core", "Dashboard", "Dashboard", "Panou principal", ["overview", "kpi", "start", "übersicht", "prezentare"]),
  f("/app/chat", "core", "AI Chat", "KI-Chat", "Chat AI", ["assistant", "ask", "frage", "intrebare", "asistent"]),
  f("/app/calendar", "core", "Calendar", "Kalender", "Calendar", ["events", "termine", "evenimente", "holiday", "urlaub", "concediu", "absence", "time off", "abwesenheit"]),
  f("/app/operations", "core", "Operations", "Operations", "Operațiuni", ["incident", "root cause", "corrective", "ursache", "cauza", "actiune corectiva", "5s"]),
  f("/app/knowledge", "core", "Knowledge base", "Wissensdatenbank", "Bază de cunoștințe", ["sop", "document", "dokumente", "documente", "procedure", "prozedur", "procedura", "upload"]),
  f("/app/faq", "core", "FAQ", "FAQ", "Întrebări frecvente", ["question", "answer", "antwort", "raspuns"]),
  f("/app/gaps", "core", "Knowledge gaps", "Wissenslücken", "Lacune de cunoștințe", ["missing", "gap", "lücke", "lipsa"]),
  f("/app/audit", "core", "Audit log", "Audit-Log", "Jurnal audit", ["history", "verlauf", "istoric", "ai audit"]),
  f("/app/users", "core", "Users", "Benutzer", "Utilizatori", ["people", "team", "personal", "angajati", "roles", "rollen", "roluri", "permission", "drepturi", "rechte"]),
  f("/app/organization", "core", "Organization", "Organisation", "Organizație", ["company", "departments", "abteilungen", "departamente", "settings", "einstellungen", "setari", "language", "sprache", "limba"]),
  f("/app/profile", "core", "My profile", "Mein Profil", "Profilul meu", ["account", "password", "passwort", "parola", "avatar", "status"]),
  f("/app/modules", "core", "Modules & license", "Module & Lizenz", "Module și licență", ["license", "lizenz", "licenta", "activation", "aktivierung", "activare"]),
  f("/app/subscription", "core", "Subscription", "Abonnement", "Abonament", ["billing", "plan", "abo"]),
  f("/app/updates", "core", "Updates", "Updates", "Actualizări", ["version", "installer", "upgrade", "check for updates", "aktualisierung"]),

  // ── Academy ────────────────────────────────────────────────────────
  f("/app/academy", "academy", "Academy", "Academy", "Academy", ["training", "schulung", "instruire", "course", "kurs", "curs"]),
  f("/app/academy/courses", "academy", "Courses", "Kurse", "Cursuri", ["lesson", "lektion", "lectie", "quiz"]),
  f("/app/academy/teacher", "academy", "Course editor", "Kurs-Editor", "Editor de cursuri", ["create course", "kurs erstellen", "creeaza curs", "instructor"]),
  f("/app/academy/certificates", "academy", "Certificates", "Zertifikate", "Certificate", ["diploma", "zertifikat", "pdf"]),
  f("/app/academy/analytics", "academy", "Academy analytics", "Academy-Analysen", "Analize Academy", ["progress", "fortschritt", "progres"]),
  f("/app/academy/settings", "academy", "Academy settings", "Academy-Einstellungen", "Setări Academy", ["retraining", "nachschulung", "reinstruire"]),

];

/** Score a feature against a query; higher is better, 0 means "no match". */
// Product workspaces are derived from the canonical catalogue so search can
// never point at a workspace route that does not exist. Localized search words
// are added per workspace where the domain vocabulary differs by language.
const WORKSPACE_KEYWORDS: Record<string, string[]> = {
  transport_overview: ["flotte", "flota", "masini", "fahrzeuge", "kpi"],
  transport_operations: ["fahrer", "sofer", "driver", "tura", "dienst", "vehicles", "trailer", "remorca", "anhänger"],
  transport_coupling: ["coupling", "remorca", "anhänger", "trailer", "atribuire", "zuordnung"],
  transport_procedures: ["prufliste", "checkliste", "checklist", "lista de verificare", "audit"],
  transport_incidents: ["unfall", "accident", "dauna", "schaden"],
  transport_map: ["karte", "harta", "map", "gps", "ruta", "route", "tour", "pauza", "pause", "561", "whatsapp"],
  transport_cmr: ["cmr", "frachtbrief", "scrisoare de transport"],
  transport_settings: ["einstellungen", "setari", "settings"],
  hr_overview: ["personal", "resurse umane", "human resources"],
  hr_employees: ["mitarbeiter", "angajati", "employee", "personalakte", "fisa angajatului", "salariu", "gehalt", "salarizare", "payroll"],
  hr_documents: ["dokumente", "documente", "unterschrift", "semnatura", "signature", "pdf"],
  hr_lifecycle: ["onboarding", "offboarding", "integrare", "plecare"],
  hr_equipment: ["ausstattung", "echipament", "asset", "laptop"],
  hr_incidents: ["vorfall", "incident", "accident de munca"],
  hr_screening: ["cv", "lebenslauf", "bewerber", "candidat", "recrutare", "shortlist", "score"],
  hr_requests: ["urlaub", "concediu", "vacation", "abwesenheit", "cerere", "antrag", "time off"],
  hr_policies: ["richtlinie", "politica", "policy"],
  hr_training: ["schulung", "instruire", "training"],
  hr_compliance: ["compliance", "conformitate", "dsgvo", "gdpr"],
  hr_intelligence: ["analytics", "alerte", "warnungen", "intelligence"],
  hr_analytics: ["analysen", "analize", "rapoarte", "reports"],
};

function workspaceGroup(product: string): FeatureEntry["group"] {
  if (product === "opsqai_transport") return "transport";
  if (product === "opsqai_hr") return "hr";
  return "core";
}

for (const w of PRODUCT_WORKSPACES) {
  if (w.status !== "implemented" || !w.route) continue;
  APP_FEATURES.push({
    to: w.route,
    group: workspaceGroup(w.product),
    label: { en: w.label, de: w.label, ro: w.label },
    keywords: [
      w.description.toLowerCase(),
      w.key.replace(/_/g, " "),
      ...(WORKSPACE_KEYWORDS[w.key] ?? []),
    ],
  });
}

export function scoreFeature(entry: FeatureEntry, query: string, lang: Lang): number {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return 0;
  const primary = entry.label[lang].toLowerCase();
  const all = [
    primary,
    entry.label.en.toLowerCase(),
    entry.label.de.toLowerCase(),
    entry.label.ro.toLowerCase(),
    ...entry.keywords,
    entry.to,
  ];
  if (primary === q) return 100;
  if (primary.startsWith(q)) return 80;
  for (const h of all) {
    if (h.startsWith(q)) return 60;
  }
  for (const h of all) {
    if (h.includes(q)) return 40;
  }
  return 0;
}

/** Best-matching application screens/functions for a query. */
export function searchFeatures(query: string, lang: Lang, limit = 6): FeatureEntry[] {
  return APP_FEATURES.map((e) => ({ e, s: scoreFeature(e, query, lang) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.e);
}
