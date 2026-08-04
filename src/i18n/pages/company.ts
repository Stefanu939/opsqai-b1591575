import { useT } from "@/i18n";

const en = {
  hero: {
    eyebrow: "Company · Made in Europe",
    serifAccent: "not instead of them.",
    headline: "AI that works for people.",
    body: "OPSQAI is building the operational AI layer for industrial companies — delivered as a Windows Self-Hosted product, sovereign by design, and owned entirely by the customer.",
    ctaPrimary: "Talk to the founders",
    ctaSecondary: "See the product",
  },
  principles: {
    eyebrow: "Mission · Vision · Why now",
    serifAccent: "operate.",
    headline: "The principles we",
    items: [
      { title: "Mission", body: "Bring AI to work for the people who run operations — supervisors, warehouse leads, plant managers — without asking them to hand their knowledge to public cloud LLMs." },
      { title: "Vision", body: "Every industrial company runs an operational AI platform inside its own boundary. Knowledge stays where it belongs; the AI helps the team instead of replacing it." },
      { title: "Why now", body: "Industrial companies cannot place operational knowledge inside public LLMs. They need ownership, governance and full data sovereignty. OPSQAI is built for that reality." },
    ],
  },
  team: {
    eyebrow: "Team · Deliberate",
    serifAccent: "overstated.",
    headline: "Small.  Never",
    intro: "Every role reflects either an active founder or a planned hire — we don't list titles we don't hold.",
    members: [
      {
        name: "Ștefan Bari",
        role: "Founder & CEO / Owner",
        body: "Owns product direction, customer relationships and commercial strategy. Drives OPSQAI's positioning as the operational AI layer for industrial companies.",
      },
      {
        name: "CTO",
        role: "Chief Technology Officer — to be named",
        body: "Owns platform, security and the license system. Ships the Windows installer, audit trail and update pipeline.",
      },
      {
        name: "Head of AI",
        role: "AI & Retrieval — planned hire",
        body: "Owns the AI adapter registry, retrieval pipeline and grounded-prompt contract.",
      },
    ],
  },
  gtm: {
    eyebrow: "Go-to-market",
    serifAccent: "industrial Europe.",
    headline: "Land in DACH. Expand into",
    phases: [
      { tag: "Phase 01", title: "DACH Logistics", body: "Warehousing, 3PL and distribution operators in Germany, Austria and Switzerland. Windows-native fits their reality; data sovereignty is non-negotiable." },
      { tag: "Phase 02", title: "Industrial Manufacturing", body: "Discrete and process manufacturing. Same operational-knowledge problem, same regulatory pressure, same infrastructure profile." },
      { tag: "Phase 03", title: "European Expansion", body: "Extend across regulated European industries where operational AI must run inside the customer's boundary." },
    ],
  },
  market: {
    eyebrow: "Market · Discipline",
    serifAccent: "defensible.",
    headline: "Large. And",
    items: [
      { tag: "TAM", value: "€4.8B", body: "EU industrial, logistics and manufacturing organisations with 250+ employees." },
      { tag: "SAM", value: "€1.1B", body: "DACH + Benelux + Nordics operators with a regulated SOP surface and enterprise IT budget." },
      { tag: "SOM", value: "€90M", body: "First-wave design partners: logistics networks, warehouse operators and mid-cap manufacturers." },
    ],
  },
  cta: {
    eyebrow: "Built in Europe",
    serifAccent: "Windows environment.",
    headline: "Deployed inside your",
    body: "Talk to us about a reference install, a partnership, or a demo of the Windows Self-Hosted product.",
    ctaPrimary: "Contact OPSQAI",
    ctaSecondary: "See the Self-Hosted product",
  },
};

type Copy = typeof en;

const de: Copy = {
  hero: {
    eyebrow: "Unternehmen · Made in Europe",
    serifAccent: "nicht statt ihnen.",
    headline: "KI, die für Menschen arbeitet.",
    body: "OPSQAI baut die operative KI-Ebene für Industrieunternehmen — als Windows-Self-Hosted-Produkt, souverän von Grund auf und vollständig im Eigentum des Kunden.",
    ctaPrimary: "Mit den Gründern sprechen",
    ctaSecondary: "Produkt ansehen",
  },
  principles: {
    eyebrow: "Mission · Vision · Warum jetzt",
    serifAccent: "arbeiten.",
    headline: "Die Prinzipien, nach denen wir",
    items: [
      { title: "Mission", body: "Wir bringen KI zur Arbeit für die Menschen, die den Betrieb führen — Vorarbeiter, Lagerleiter, Werkleiter — ohne dass sie ihr Wissen öffentlichen Cloud-LLMs überlassen müssen." },
      { title: "Vision", body: "Jedes Industrieunternehmen betreibt eine operative KI-Plattform innerhalb der eigenen Grenzen. Wissen bleibt dort, wo es hingehört; die KI unterstützt das Team, statt es zu ersetzen." },
      { title: "Warum jetzt", body: "Industrieunternehmen können operatives Wissen nicht in öffentlichen LLMs ablegen. Sie brauchen Eigentum, Governance und volle Datensouveränität. OPSQAI ist genau dafür gebaut." },
    ],
  },
  team: {
    eyebrow: "Team · Bewusst",
    serifAccent: "übertrieben.",
    headline: "Klein.  Nie",
    intro: "Jede Rolle steht entweder für einen aktiven Gründer oder eine geplante Einstellung — wir führen keine Titel, die wir nicht innehaben.",
    members: [
      {
        name: "Ștefan Bari",
        role: "Gründer & CEO / Inhaber",
        body: "Verantwortet Produktrichtung, Kundenbeziehungen und Unternehmensstrategie. Treibt die Positionierung von OPSQAI als operative KI-Ebene für Industrieunternehmen voran.",
      },
      {
        name: "CTO",
        role: "Chief Technology Officer — noch zu besetzen",
        body: "Verantwortet Plattform, Sicherheit und das Lizenzsystem. Liefert den Windows-Installer, das Audit-Log und die Update-Pipeline.",
      },
      {
        name: "Head of AI",
        role: "KI & Retrieval — geplante Einstellung",
        body: "Verantwortet das KI-Adapter-Register, die Retrieval-Pipeline und den fundierten Prompt-Vertrag.",
      },
    ],
  },
  gtm: {
    eyebrow: "Markteinführung",
    serifAccent: "das industrielle Europa.",
    headline: "Start in DACH. Expansion in",
    phases: [
      { tag: "Phase 01", title: "DACH-Logistik", body: "Lager-, 3PL- und Distributionsbetreiber in Deutschland, Österreich und der Schweiz. Windows-nativ passt zu ihrer Realität; Datensouveränität ist nicht verhandelbar." },
      { tag: "Phase 02", title: "Industrielle Fertigung", body: "Stück- und Prozessfertigung. Dasselbe Problem mit operativem Wissen, derselbe regulatorische Druck, dasselbe Infrastrukturprofil." },
      { tag: "Phase 03", title: "Europäische Expansion", body: "Ausweitung auf regulierte europäische Branchen, in denen operative KI innerhalb der Grenzen des Kunden laufen muss." },
    ],
  },
  market: {
    eyebrow: "Markt · Disziplin",
    serifAccent: "verteidigbar.",
    headline: "Groß. Und",
    items: [
      { tag: "TAM", value: "€4,8 Mrd.", body: "EU-Industrie-, Logistik- und Fertigungsunternehmen mit 250+ Mitarbeitenden." },
      { tag: "SAM", value: "€1,1 Mrd.", body: "DACH + Benelux + Nordics mit regulierter SOP-Fläche und Enterprise-IT-Budget." },
      { tag: "SOM", value: "€90 Mio.", body: "Erste Design-Partner: Logistiknetzwerke, Lagerbetreiber und mittelständische Fertigungsunternehmen." },
    ],
  },
  cta: {
    eyebrow: "Entwickelt in Europa",
    serifAccent: "Windows-Umgebung.",
    headline: "Eingesetzt in Ihrer",
    body: "Sprechen Sie mit uns über eine Referenzinstallation, eine Partnerschaft oder eine Demo des Windows-Self-Hosted-Produkts.",
    ctaPrimary: "OPSQAI kontaktieren",
    ctaSecondary: "Self-Hosted-Produkt ansehen",
  },
};

export function useCompanyCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : en;
}
