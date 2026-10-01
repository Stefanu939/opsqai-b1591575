// Shared RO/DE translations for common English UI labels rendered by shared
// components (MetricTile, Panel). Unknown strings pass through unchanged.
import { useT } from "@/i18n";

const L: Record<string, [ro: string, de: string]> = {
  "Open gaps": ["Lacune deschise", "Offene Lücken"],
  "Resolved (30d)": ["Rezolvate (30z)", "Gelöst (30T)"],
  "Avg. confidence": ["Încredere medie", "Ø Konfidenz"],
  "Avg. time to close": ["Timp mediu de închidere", "Ø Zeit bis Abschluss"],
  "Total FAQs": ["Total FAQ", "FAQs gesamt"],
  Categories: ["Categorii", "Kategorien"],
  "Bilingual coverage": ["Acoperire bilingvă", "Zweisprachige Abdeckung"],
  "Avg. answer length": ["Lungime medie răspuns", "Ø Antwortlänge"],
  "Active documents": ["Documente active", "Aktive Dokumente"],
  "Indexed chunks": ["Fragmente indexate", "Indexierte Abschnitte"],
  "Critical SOPs": ["SOP-uri critice", "Kritische SOPs"],
  "Installed version": ["Versiune instalată", "Installierte Version"],
  "Latest available": ["Ultima disponibilă", "Neueste verfügbar"],
  "Releases published": ["Versiuni publicate", "Veröffentlichte Versionen"],
  "User capacity": ["Capacitate utilizatori", "Benutzerkapazität"],
  "seats used": ["locuri ocupate", "Plätze belegt"],
  Healthy: ["Funcțional", "Gesund"],
  "Needs attention": ["Necesită atenție", "Handlungsbedarf"],
  "Action required": ["Acțiune necesară", "Aktion erforderlich"],
  Unknown: ["Necunoscut", "Unbekannt"],
  "Courses library": ["Biblioteca de cursuri", "Kursbibliothek"],
  Documents: ["Documente", "Dokumente"],
  Users: ["Utilizatori", "Benutzer"],
  Settings: ["Setări", "Einstellungen"],
  Overview: ["Prezentare generală", "Übersicht"],
  Activity: ["Activitate", "Aktivität"],
  History: ["Istoric", "Verlauf"],
  Status: ["Stare", "Status"],
};

export function translateLabel(s: string, lang: string): string {
  const row = L[s];
  if (!row) return s;
  return lang === "ro" ? row[0] : lang === "de" ? row[1] : s;
}

export function useUiLabel() {
  const { lang } = useT();
  return <T,>(v: T): T => (typeof v === "string" ? (translateLabel(v, lang) as T) : v);
}
