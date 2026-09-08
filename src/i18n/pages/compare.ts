// Public comparison page copy — "OPSQAI vs. the way you work today".
// Honest, confrontational but fair: we name the pain of the status quo and
// show the mechanism OPSQAI uses instead. No invented customer results.
import { useT } from "@/i18n";

const en = {
  eyebrow: "Comparison",
  headline: "OPSQAI vs. the way",
  serifAccent: "you work today.",
  body: "Nobody budgets for the way things run today — yet it is the most expensive line in your company. Here is the same week, twice: once as it probably looks now, once with OPSQAI Self-Hosted on your own Windows server.",
  todayCol: "How it works today",
  opsqaiCol: "With OPSQAI",
  rows: [
    {
      topic: "Finding an answer",
      today: "Search folders, scroll chats, ask a colleague — who may be on holiday.",
      opsqai: "One question, one answer — grounded exclusively in your own documents, with the source attached.",
    },
    {
      topic: "Using AI at work",
      today: "Staff paste company data into public AI tools you cannot control or audit.",
      opsqai: "AI runs on your own server, on your own provider. Nothing leaves the company.",
    },
    {
      topic: "New employee, week one",
      today: "Shadowing a colleague for weeks; the colleague's output drops while they explain.",
      opsqai: "Academy courses built from your own SOPs, with quizzes and certificates — knowledge no longer walks out the door.",
    },
    {
      topic: "Audit preparation",
      today: "A lost weekend assembling versions, signatures and evidence from six places.",
      opsqai: "SOP versioning, audit trails and one-click exports — evidence exists because work happened, not because someone compiled it.",
    },
    {
      topic: "Expiring documents & licenses",
      today: "An Excel sheet someone forgot to check; you find out when it is already a problem.",
      opsqai: "Alerts before anything expires — in Transport, HR and Compliance — surfaced where people actually look.",
    },
    {
      topic: "Cost model",
      today: "Per-seat SaaS subscriptions that grow every time you hire, for tools that do not talk to each other.",
      opsqai: "One-time Core platform license, domain products you actually enable, predictable annual maintenance. No seat inflation.",
    },
    {
      topic: "When a key person leaves",
      today: "Their knowledge leaves with them; the replacement starts from zero.",
      opsqai: "Their knowledge was already captured — searchable, trainable, and still yours.",
    },
  ],
  honestyTitle: "What we deliberately did not put here",
  honestyBody:
    "No invented percentages, no fake customer logos, no 'saves 10 hours a week' claims. When our first pilot results are measured and confirmed, we will publish them here — with real numbers.",
  pilotSlotTitle: "First pilot results",
  pilotSlotBody:
    "This space is reserved. The 30-day pilot measures search time, repeated questions and onboarding effort in your company — and the results, once real, appear on this page instead of promises.",
  ctaPrimary: "Start the free 30-day pilot",
  ctaSecondary: "Calculate what today costs you",
  metaTitle: "OPSQAI vs. the way you work today — honest comparison",
  metaDescription:
    "A direct comparison: folders, chat archaeology and public AI tools vs. OPSQAI Self-Hosted. No invented numbers — just the same week, twice.",
};

type Copy = typeof en;

const de: Copy = {
  eyebrow: "Vergleich",
  headline: "OPSQAI vs. so wie Sie",
  serifAccent: "heute arbeiten.",
  body: "Niemand budgetiert die Art, wie es heute läuft — dabei ist sie der teuerste Posten im Unternehmen. Hier ist dieselbe Woche, zweimal: einmal wie sie jetzt vermutlich aussieht, einmal mit OPSQAI Self-Hosted auf Ihrem eigenen Windows-Server.",
  todayCol: "Wie es heute läuft",
  opsqaiCol: "Mit OPSQAI",
  rows: [
    {
      topic: "Eine Antwort finden",
      today: "Ordner durchsuchen, Chats durchscrollen, Kollegen fragen — der vielleicht im Urlaub ist.",
      opsqai: "Eine Frage, eine Antwort — ausschließlich aus Ihren eigenen Dokumenten, mit Quellenangabe.",
    },
    {
      topic: "KI im Arbeitsalltag",
      today: "Mitarbeitende fügen Firmendaten in öffentliche KI-Werkzeuge ein — unkontrollierbar, nicht auditierbar.",
      opsqai: "KI läuft auf Ihrem eigenen Server, mit Ihrem eigenen Anbieter. Nichts verlässt das Unternehmen.",
    },
    {
      topic: "Neuer Mitarbeiter, erste Woche",
      today: "Wochenlanges Mitlaufen bei einem Kollegen — dessen eigene Leistung dabei sinkt.",
      opsqai: "Academy-Kurse aus Ihren eigenen SOPs, mit Quiz und Zertifikaten — Wissen geht nicht mehr mit aus der Tür.",
    },
    {
      topic: "Audit-Vorbereitung",
      today: "Ein verlorenes Wochenende, um Versionen, Freigaben und Nachweise aus sechs Stellen zusammenzutragen.",
      opsqai: "SOP-Versionierung, Audit-Trails und Exporte per Klick — Nachweise entstehen, weil gearbeitet wurde, nicht weil jemand kompiliert.",
    },
    {
      topic: "Ablaufende Dokumente & Lizenzen",
      today: "Eine Excel-Liste, die niemand mehr prüft; Sie erfahren es, wenn es bereits ein Problem ist.",
      opsqai: "Warnungen bevor etwas abläuft — in Transport, HR und Compliance — dort, wo man sie wirklich sieht.",
    },
    {
      topic: "Kostenmodell",
      today: "Pro-Nutzer-SaaS-Abos, die bei jeder Einstellung wachsen, für Werkzeuge, die nicht miteinander sprechen.",
      opsqai: "Einmalige Core-Plattform-Lizenz, Fachprodukte nach Bedarf, planbare jährliche Wartung. Keine Lizenzinflation pro Kopf.",
    },
    {
      topic: "Wenn eine Schlüsselperson geht",
      today: "Ihr Wissen geht mit; der Nachfolger beginnt bei null.",
      opsqai: "Ihr Wissen war längst erfasst — durchsuchbar, trainierbar und weiterhin Ihres.",
    },
  ],
  honestyTitle: "Was wir hier bewusst weglassen",
  honestyBody:
    "Keine erfundenen Prozentzahlen, keine Fake-Logos, kein 'spart 10 Stunden pro Woche'. Sobald die ersten Pilot-Ergebnisse gemessen und bestätigt sind, veröffentlichen wir sie hier — mit echten Zahlen.",
  pilotSlotTitle: "Erste Pilot-Ergebnisse",
  pilotSlotBody:
    "Dieser Platz ist reserviert. Der 30-Tage-Pilot misst Suchzeit, wiederholte Fragen und Einarbeitungsaufwand in Ihrem Unternehmen — und die Ergebnisse erscheinen hier, sobald sie real sind, statt Versprechen.",
  ctaPrimary: "Kostenlosen 30-Tage-Pilot starten",
  ctaSecondary: "Berechnen, was heute kostet",
  metaTitle: "OPSQAI vs. so wie Sie heute arbeiten — ehrlicher Vergleich",
  metaDescription:
    "Der direkte Vergleich: Ordner, Chat-Archäologie und öffentliche KI-Werkzeuge vs. OPSQAI Self-Hosted. Keine erfundenen Zahlen — nur dieselbe Woche, zweimal.",
};

const ro: Copy = {
  eyebrow: "Comparație",
  headline: "OPSQAI vs. cum lucrați",
  serifAccent: "astăzi.",
  body: "Nimeni nu bugetează felul în care merg lucrurile azi — deși este cea mai scumpă linie din companie. Iată aceeași săptămână, de două ori: o dată cum arată probabil acum, o dată cu OPSQAI Self-Hosted pe propriul server Windows.",
  todayCol: "Cum funcționează azi",
  opsqaiCol: "Cu OPSQAI",
  rows: [
    {
      topic: "Găsirea unui răspuns",
      today: "Cauți prin foldere, derulezi chat-uri, întrebi un coleg — care poate fi în concediu.",
      opsqai: "O întrebare, un răspuns — exclusiv din documentele dumneavoastră, cu sursa atașată.",
    },
    {
      topic: "AI la locul de muncă",
      today: "Angajații introduc date ale companiei în instrumente AI publice, pe care nu le puteți controla sau audita.",
      opsqai: "AI-ul rulează pe serverul dumneavoastră, cu furnizorul dumneavoastră. Nimic nu pleacă din companie.",
    },
    {
      topic: "Angajat nou, prima săptămână",
      today: "Săptămâni de umbrire a unui coleg — al cărui randament scade cât timp explică.",
      opsqai: "Cursuri Academy construite din propriile SOP-uri, cu quizuri și certificate — cunoștințele nu mai pleacă odată cu omul.",
    },
    {
      topic: "Pregătirea unui audit",
      today: "Un weekend pierdut adunând versiuni, semnături și dovezi din șase locuri.",
      opsqai: "Versionare SOP, jurnal de audit și exporturi dintr-un clic — dovezile există pentru că s-a lucrat, nu pentru că cineva le-a compilat.",
    },
    {
      topic: "Documente și licențe care expiră",
      today: "Un Excel pe care cineva a uitat să-l verifice; aflați când e deja o problemă.",
      opsqai: "Alerte înainte ca ceva să expire — în Transport, HR și Conformitate — acolo unde chiar le vede lumea.",
    },
    {
      topic: "Modelul de cost",
      today: "Abonamente SaaS per utilizator, care cresc la fiecare angajare, pentru instrumente care nu vorbesc între ele.",
      opsqai: "Licență unică pentru platforma Core, produse de domeniu activate la nevoie, mentenanță anuală previzibilă. Fără inflație de licențe per angajat.",
    },
    {
      topic: "Când pleacă o persoană cheie",
      today: "Cunoștințele ei pleacă odată cu ea; înlocuitorul pornește de la zero.",
      opsqai: "Cunoștințele erau deja capturate — căutabile, antrenabile și în continuare ale dumneavoastră.",
    },
  ],
  honestyTitle: "Ce am omis în mod deliberat",
  honestyBody:
    "Fără procente inventate, fără logo-uri false de clienți, fără afirmații de tipul «economisiți 10 ore pe săptămână». Când primele rezultate din piloți vor fi măsurate și confirmate, le publicăm aici — cu cifre reale.",
  pilotSlotTitle: "Primele rezultate din piloți",
  pilotSlotBody:
    "Acest spațiu este rezervat. Pilotul de 30 de zile măsoară timpul de căutare, întrebările repetate și efortul de integrare în compania dumneavoastră — iar rezultatele, odată reale, apar pe această pagină în locul promisiunilor.",
  ctaPrimary: "Începeți pilotul gratuit de 30 de zile",
  ctaSecondary: "Calculați cât vă costă situația de azi",
  metaTitle: "OPSQAI vs. cum lucrați astăzi — comparație onestă",
  metaDescription:
    "Comparația directă: foldere, arheologie în chat-uri și instrumente AI publice vs. OPSQAI Self-Hosted. Fără cifre inventate — doar aceeași săptămână, de două ori.",
};

export function useCompareCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
