import { useT } from "@/i18n";

// Copy for the public /product-overview page (EN + DE).

const en = {
  hero: {
    eyebrow: "Product Overview · Operational Intelligence Platform",
    headline: "One workspace for operational knowledge, AI",
    serifAccent: "and intelligence.",
    body: "OPSQAI brings company knowledge, AI-assisted workflows, learning and operational insights together in one connected platform.",
    body2:
      "The goal is to help organizations make approved knowledge easier to access, identify gaps, support employees and give management better visibility into the health of operational knowledge.",
    ctaPrimary: "Explore the platform",
    ctaPdf: "Download Product Overview",
  },
  what: {
    eyebrow: "What is OPSQAI",
    headline: "Not another",
    serifAccent: "generic AI chatbot.",
    body: "OPSQAI connects the knowledge an organization already has with the people who need it, while helping teams identify missing, outdated or difficult-to-access information.",
    body2:
      "Instead of treating knowledge, learning, AI and management as isolated systems, OPSQAI brings them into one operational workspace.",
    center: "OPSQAI",
    nodes: [
      { label: "Knowledge", hint: "Knowledge Base, SOPs, FAQs, notes" },
      { label: "AI", hint: "Answers from approved sources" },
      { label: "Learning", hint: "Academy, courses, progress" },
      { label: "Intelligence", hint: "AI Audit, gaps, signals" },
      { label: "Management", hint: "Dashboards, roles, KPIs" },
      { label: "Deployment", hint: "Cloud or Self-Hosted" },
    ],
  },
  capabilities: {
    eyebrow: "Six core capabilities",
    headline: "What the platform",
    serifAccent: "actually does.",
    items: [
      {
        title: "Knowledge",
        intro: "Bring operational knowledge into a structured workspace.",
        items: [
          "Knowledge Base",
          "SOPs and operational documents",
          "FAQs",
          "Notes",
          "Document lifecycle",
          "Document age and update visibility",
          "Version awareness",
          "Knowledge review signals",
        ],
        key: "Make approved company knowledge easier to find, manage and maintain.",
      },
      {
        title: "AI",
        intro: "Give employees a natural way to interact with approved company knowledge.",
        items: [
          "AI Chat",
          "Answers based on approved knowledge",
          "Source-backed responses",
          "Context-aware conversations",
          "Knowledge Gap detection",
          "Dynamic, professional interaction",
        ],
        key: "Turn approved knowledge into something employees can actually use when they need it.",
      },
      {
        title: "Learning",
        intro: "Connect company knowledge with onboarding and employee development.",
        items: [
          "Academy",
          "Courses",
          "Learning workflows",
          "Assignments",
          "Progress tracking",
          "Knowledge and learning signals",
        ],
        key: "Help employees learn company processes in a structured way.",
      },
      {
        title: "Operational Intelligence",
        intro:
          "Understand the health of your organization's knowledge and identify where attention is needed.",
        items: [
          "AI Audit",
          "Knowledge health signals",
          "Knowledge Gaps",
          "Friction signals",
          "Learning signals",
          "Recommendations",
          "Suggested actions",
          "People and areas requiring support",
        ],
        key: "Move from simply storing knowledge to understanding where knowledge is missing, outdated or creating friction.",
      },
      {
        title: "Management",
        intro: "Give management a clearer overview of the operational workspace.",
        items: [
          "Management Dashboard",
          "KPIs",
          "User capacity",
          "Departments",
          "Users",
          "Roles",
          "Module access",
          "Notifications",
          "Maintenance visibility",
        ],
        key: "Make important operational signals easier to see and act on.",
      },
      {
        title: "Cloud or Self-Hosted",
        intro: "OPSQAI supports different deployment models.",
        items: [
          "Runs in the customer's own environment",
          "Local AI engine",
          "Local database",
          "Local semantic search",
          "Offline-capable operation",
          "No mandatory Cloud dependency for daily operation",
          "Backup & Recovery",
          "Signed offline licensing",
          "Role-based access control",
        ],
        key: "Your knowledge. Your infrastructure. Your AI.",
      },
    ],
  },
  how: {
    eyebrow: "How OPSQAI works",
    headline: "From company knowledge to",
    serifAccent: "operational clarity.",
    stages: [
      {
        label: "Company knowledge",
        items: ["SOPs", "FAQs", "Operational documents", "Approved information"],
      },
      {
        label: "OPSQAI knowledge layer",
        items: ["Structured", "Versioned", "Lifecycle-aware", "Access-controlled"],
      },
      {
        label: "AI + Learning + Analysis",
        items: ["Grounded answers", "Courses and assignments", "AI Audit", "Gap detection"],
      },
      {
        label: "Employees and management",
        items: [
          "Employees get answers",
          "Managers see insights",
          "Knowledge Gaps become visible",
          "Recommended actions can be reviewed",
        ],
      },
    ],
    outcome: "A stronger operational knowledge system.",
  },
  useCases: {
    eyebrow: "Real use cases",
    headline: "What this looks like",
    serifAccent: "day to day.",
    items: [
      {
        title: "Find the right procedure",
        body: "An employee needs to know how to handle a specific operational situation. They ask OPSQAI and receive guidance based on approved company knowledge and relevant sources.",
      },
      {
        title: "Onboard faster",
        body: "New employees can access structured knowledge, learning content and company procedures without depending entirely on colleagues for every question.",
      },
      {
        title: "Find what is missing",
        body: "Repeated questions and weakly supported requests can reveal Knowledge Gaps. Management can review these gaps and create or improve approved knowledge.",
      },
      {
        title: "Keep knowledge healthy",
        body: "Document lifecycle and AI Audit signals help identify information that may require review: knowledge that has not been reviewed recently, documents unchanged since their initial upload, and areas where information may be missing.",
      },
      {
        title: "Give management better visibility",
        body: "Dashboards, KPIs, AI Audit and recommendations help management understand knowledge coverage, Knowledge Gaps, areas requiring support, learning signals, operational friction and recommended actions.",
      },
    ],
    note: "All recommendations remain advisory and require human review.",
  },
  selfHosted: {
    eyebrow: "OPSQAI Self-Hosted",
    headline: "Your knowledge. Your infrastructure.",
    serifAccent: "Your AI.",
    body: "OPSQAI Self-Hosted is designed for organizations that want the platform to run inside their own environment.",
    items: [
      {
        title: "Local deployment",
        body: "The application runs on the customer's own Windows machine or infrastructure.",
      },
      { title: "Local AI", body: "The Self-Hosted environment uses a local AI engine." },
      {
        title: "Local data",
        body: "Operational knowledge and application data remain within the customer's environment.",
      },
      {
        title: "Offline-capable",
        body: "The daily platform workflow can continue without a mandatory Cloud dependency.",
      },
      {
        title: "Local knowledge search",
        body: "Knowledge retrieval and semantic search operate within the Self-Hosted environment.",
      },
      {
        title: "Backup & Recovery",
        body: "Local backup and recovery functionality supports the Self-Hosted installation.",
      },
      {
        title: "Offline licensing",
        body: "Licensing can be cryptographically verified locally.",
      },
    ],
    cta: "Self-hosted details",
  },
  glance: {
    eyebrow: "Platform at a glance",
    headline: "The whole platform",
    serifAccent: "on one screen.",
    groups: [
      { name: "Knowledge", items: ["Knowledge Base", "SOPs", "FAQs", "Notes", "Lifecycle"] },
      { name: "AI", items: ["AI Chat", "Sources", "Knowledge Gaps", "Recommendations"] },
      { name: "Learning", items: ["Academy", "Courses", "Assignments", "Progress"] },
      { name: "Intelligence", items: ["AI Audit", "Knowledge health", "Friction signals", "Insights"] },
      { name: "Management", items: ["Dashboard", "KPIs", "Users", "Roles", "Departments"] },
      {
        name: "Deployment",
        items: ["Cloud", "Self-Hosted", "Local AI", "Offline operation", "Backup & Recovery"],
      },
    ],
  },
  finalCta: {
    headline: "See OPSQAI",
    serifAccent: "in action.",
    body: "Explore how OPSQAI can connect operational knowledge, AI, learning and management intelligence in one workspace.",
    ctaPrimary: "Request a demo",
    ctaPdf: "Download Product Overview PDF",
  },
};

type Copy = typeof en;

const de: Copy = {
  hero: {
    eyebrow: "Produktüberblick · Operational Intelligence Platform",
    headline: "Ein Arbeitsbereich für operatives Wissen, KI",
    serifAccent: "und Intelligenz.",
    body: "OPSQAI verbindet Unternehmenswissen, KI-gestützte Abläufe, Lernen und operative Erkenntnisse in einer zusammenhängenden Plattform.",
    body2:
      "Ziel ist es, freigegebenes Wissen leichter zugänglich zu machen, Lücken zu erkennen, Mitarbeitende zu unterstützen und dem Management bessere Sicht auf den Zustand des operativen Wissens zu geben.",
    ctaPrimary: "Plattform entdecken",
    ctaPdf: "Produktüberblick herunterladen",
  },
  what: {
    eyebrow: "Was ist OPSQAI",
    headline: "Kein weiterer",
    serifAccent: "generischer KI-Chatbot.",
    body: "OPSQAI verbindet das Wissen, das ein Unternehmen bereits besitzt, mit den Menschen, die es benötigen — und hilft Teams, fehlende, veraltete oder schwer zugängliche Informationen zu erkennen.",
    body2:
      "Statt Wissen, Lernen, KI und Management als getrennte Systeme zu behandeln, führt OPSQAI sie in einem operativen Arbeitsbereich zusammen.",
    center: "OPSQAI",
    nodes: [
      { label: "Wissen", hint: "Wissensdatenbank, SOPs, FAQs, Notizen" },
      { label: "KI", hint: "Antworten aus freigegebenen Quellen" },
      { label: "Lernen", hint: "Academy, Kurse, Fortschritt" },
      { label: "Intelligenz", hint: "KI-Audit, Lücken, Signale" },
      { label: "Management", hint: "Dashboards, Rollen, KPIs" },
      { label: "Betrieb", hint: "Cloud oder Self-Hosted" },
    ],
  },
  capabilities: {
    eyebrow: "Sechs Kernbereiche",
    headline: "Was die Plattform",
    serifAccent: "tatsächlich leistet.",
    items: [
      {
        title: "Wissen",
        intro: "Operatives Wissen in einem strukturierten Arbeitsbereich zusammenführen.",
        items: [
          "Wissensdatenbank",
          "SOPs und operative Dokumente",
          "FAQs",
          "Notizen",
          "Dokumenten-Lebenszyklus",
          "Alter und Aktualisierungsstand sichtbar",
          "Versionsbewusstsein",
          "Signale für Wissensprüfung",
        ],
        key: "Freigegebenes Unternehmenswissen leichter finden, verwalten und pflegen.",
      },
      {
        title: "KI",
        intro: "Mitarbeitenden einen natürlichen Zugang zu freigegebenem Wissen geben.",
        items: [
          "KI-Chat",
          "Antworten auf Basis freigegebenen Wissens",
          "Quellenbelegte Antworten",
          "Kontextbewusste Unterhaltungen",
          "Erkennung von Wissenslücken",
          "Dynamische, professionelle Interaktion",
        ],
        key: "Freigegebenes Wissen wird zu etwas, das Mitarbeitende im Moment des Bedarfs nutzen können.",
      },
      {
        title: "Lernen",
        intro: "Unternehmenswissen mit Onboarding und Personalentwicklung verbinden.",
        items: [
          "Academy",
          "Kurse",
          "Lern-Workflows",
          "Zuweisungen",
          "Fortschrittsverfolgung",
          "Wissens- und Lernsignale",
        ],
        key: "Mitarbeitende lernen Unternehmensprozesse strukturiert.",
      },
      {
        title: "Operative Intelligenz",
        intro:
          "Den Zustand des Unternehmenswissens verstehen und erkennen, wo Aufmerksamkeit nötig ist.",
        items: [
          "KI-Audit",
          "Signale zur Wissensqualität",
          "Wissenslücken",
          "Reibungssignale",
          "Lernsignale",
          "Empfehlungen",
          "Vorgeschlagene Maßnahmen",
          "Personen und Bereiche mit Unterstützungsbedarf",
        ],
        key: "Vom reinen Speichern von Wissen hin zum Verständnis, wo Wissen fehlt, veraltet ist oder Reibung erzeugt.",
      },
      {
        title: "Management",
        intro: "Dem Management einen klareren Überblick über den operativen Arbeitsbereich geben.",
        items: [
          "Management-Dashboard",
          "KPIs",
          "Nutzerkapazität",
          "Abteilungen",
          "Benutzer",
          "Rollen",
          "Modulzugriff",
          "Benachrichtigungen",
          "Wartungsübersicht",
        ],
        key: "Wichtige operative Signale werden leichter sichtbar und handhabbar.",
      },
      {
        title: "Cloud oder Self-Hosted",
        intro: "OPSQAI unterstützt unterschiedliche Betriebsmodelle.",
        items: [
          "Läuft in der eigenen Umgebung des Kunden",
          "Lokale KI-Engine",
          "Lokale Datenbank",
          "Lokale semantische Suche",
          "Offline-fähiger Betrieb",
          "Keine zwingende Cloud-Abhängigkeit im Tagesbetrieb",
          "Backup & Wiederherstellung",
          "Signierte Offline-Lizenzierung",
          "Rollenbasierte Zugriffskontrolle",
        ],
        key: "Ihr Wissen. Ihre Infrastruktur. Ihre KI.",
      },
    ],
  },
  how: {
    eyebrow: "So funktioniert OPSQAI",
    headline: "Von Unternehmenswissen zu",
    serifAccent: "operativer Klarheit.",
    stages: [
      {
        label: "Unternehmenswissen",
        items: ["SOPs", "FAQs", "Operative Dokumente", "Freigegebene Informationen"],
      },
      {
        label: "OPSQAI Wissensebene",
        items: ["Strukturiert", "Versioniert", "Lebenszyklus-bewusst", "Zugriffsgesteuert"],
      },
      {
        label: "KI + Lernen + Analyse",
        items: ["Belegte Antworten", "Kurse und Zuweisungen", "KI-Audit", "Lückenerkennung"],
      },
      {
        label: "Mitarbeitende und Management",
        items: [
          "Mitarbeitende erhalten Antworten",
          "Management sieht Erkenntnisse",
          "Wissenslücken werden sichtbar",
          "Empfohlene Maßnahmen können geprüft werden",
        ],
      },
    ],
    outcome: "Ein belastbareres operatives Wissenssystem.",
  },
  useCases: {
    eyebrow: "Konkrete Anwendungsfälle",
    headline: "Wie das im Alltag",
    serifAccent: "aussieht.",
    items: [
      {
        title: "Die richtige Prozedur finden",
        body: "Eine Mitarbeiterin muss wissen, wie eine bestimmte operative Situation zu behandeln ist. Sie fragt OPSQAI und erhält eine Antwort auf Basis freigegebenen Unternehmenswissens und relevanter Quellen.",
      },
      {
        title: "Schneller einarbeiten",
        body: "Neue Mitarbeitende erhalten Zugang zu strukturiertem Wissen, Lerninhalten und Unternehmensprozessen, ohne für jede Frage vollständig auf Kolleginnen und Kollegen angewiesen zu sein.",
      },
      {
        title: "Finden, was fehlt",
        body: "Wiederkehrende Fragen und schwach belegte Anfragen können Wissenslücken aufzeigen. Das Management kann diese Lücken prüfen und freigegebenes Wissen erstellen oder verbessern.",
      },
      {
        title: "Wissen aktuell halten",
        body: "Dokumenten-Lebenszyklus und KI-Audit-Signale helfen, Informationen zu erkennen, die eine Prüfung benötigen: lange nicht geprüftes Wissen, seit dem Upload unveränderte Dokumente und Bereiche, in denen Informationen fehlen könnten.",
      },
      {
        title: "Dem Management bessere Sicht geben",
        body: "Dashboards, KPIs, KI-Audit und Empfehlungen helfen dem Management, Wissensabdeckung, Wissenslücken, Bereiche mit Unterstützungsbedarf, Lernsignale, operative Reibung und empfohlene Maßnahmen zu verstehen.",
      },
    ],
    note: "Alle Empfehlungen sind beratend und erfordern eine menschliche Prüfung.",
  },
  selfHosted: {
    eyebrow: "OPSQAI Self-Hosted",
    headline: "Ihr Wissen. Ihre Infrastruktur.",
    serifAccent: "Ihre KI.",
    body: "OPSQAI Self-Hosted richtet sich an Organisationen, die die Plattform in ihrer eigenen Umgebung betreiben möchten.",
    items: [
      {
        title: "Lokaler Betrieb",
        body: "Die Anwendung läuft auf der eigenen Windows-Maschine oder Infrastruktur des Kunden.",
      },
      { title: "Lokale KI", body: "Die Self-Hosted-Umgebung nutzt eine lokale KI-Engine." },
      {
        title: "Lokale Daten",
        body: "Operatives Wissen und Anwendungsdaten verbleiben in der Umgebung des Kunden.",
      },
      {
        title: "Offline-fähig",
        body: "Der tägliche Ablauf der Plattform funktioniert ohne zwingende Cloud-Abhängigkeit.",
      },
      {
        title: "Lokale Wissenssuche",
        body: "Wissensabruf und semantische Suche laufen innerhalb der Self-Hosted-Umgebung.",
      },
      {
        title: "Backup & Wiederherstellung",
        body: "Lokale Backup- und Wiederherstellungsfunktionen unterstützen die Self-Hosted-Installation.",
      },
      {
        title: "Offline-Lizenzierung",
        body: "Lizenzen können lokal kryptografisch verifiziert werden.",
      },
    ],
    cta: "Self-Hosted-Details",
  },
  glance: {
    eyebrow: "Plattform im Überblick",
    headline: "Die gesamte Plattform",
    serifAccent: "auf einem Blick.",
    groups: [
      { name: "Wissen", items: ["Wissensdatenbank", "SOPs", "FAQs", "Notizen", "Lebenszyklus"] },
      { name: "KI", items: ["KI-Chat", "Quellen", "Wissenslücken", "Empfehlungen"] },
      { name: "Lernen", items: ["Academy", "Kurse", "Zuweisungen", "Fortschritt"] },
      {
        name: "Intelligenz",
        items: ["KI-Audit", "Wissensqualität", "Reibungssignale", "Erkenntnisse"],
      },
      { name: "Management", items: ["Dashboard", "KPIs", "Benutzer", "Rollen", "Abteilungen"] },
      {
        name: "Betrieb",
        items: ["Cloud", "Self-Hosted", "Lokale KI", "Offline-Betrieb", "Backup & Wiederherstellung"],
      },
    ],
  },
  finalCta: {
    headline: "OPSQAI",
    serifAccent: "in Aktion erleben.",
    body: "Entdecken Sie, wie OPSQAI operatives Wissen, KI, Lernen und Management-Intelligenz in einem Arbeitsbereich verbindet.",
    ctaPrimary: "Demo anfragen",
    ctaPdf: "Produktüberblick als PDF",
  },
};

export const productOverviewCopy: Record<string, Copy> = { en, de };

export function useProductOverviewCopy(): Copy {
  const { lang } = useT();
  return productOverviewCopy[lang] ?? en;
}
