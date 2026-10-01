import { useT } from "@/i18n";

const en = {
  hero: {
    eyebrow: "Company · Made in Europe",
    serifAccent: "not instead of them.",
    headline: "AI that works for people.",
    body: "OPSQAI builds a sovereign operational AI layer for organisations with complex or regulated work — from banking and financial services to logistics, manufacturing and people operations.",
    ctaPrimary: "Talk to the founders",
    ctaSecondary: "See the product",
  },
  principles: {
    eyebrow: "Mission · Vision · Why now",
    serifAccent: "operate.",
    headline: "The principles we",
    items: [
      { title: "Mission", body: "Bring governed AI to the people who run critical work — without asking organisations to hand sensitive knowledge to public cloud LLMs." },
      { title: "Vision", body: "Every organisation can shape an operational AI workspace around its own problems, inside its own boundary. The AI supports people; it does not replace accountable decisions." },
      { title: "Why now", body: "Banks, logistics operators and other regulated businesses need faster access to knowledge without losing ownership, governance or data sovereignty." },
    ],
  },
  team: {
    eyebrow: "Team · Deliberate",
    serifAccent: "overstated.",
    headline: "Small.  Never",
    intro: "Founder-led, product-focused and direct with customers.",
    members: [
      {
        name: "Ștefan Bari",
        role: "Founder & CEO / Owner",
        body: "Owns product direction, customer relationships and commercial strategy. Drives OPSQAI's problem-first approach across regulated and operationally complex organisations.",
      },
    ],
  },
  gtm: {
    eyebrow: "Go-to-market",
    serifAccent: "regulated Europe.",
    headline: "Start with one problem. Expand across",
    phases: [
      { tag: "Phase 01", title: "Logistics & Operations", body: "Solve concrete knowledge, training and control problems in logistics, transport and operational teams." },
      { tag: "Phase 02", title: "Banking & Financial Services", body: "Support internal procedures, learning and evidence workflows where human decisions, auditability and data boundaries matter." },
      { tag: "Phase 03", title: "Regulated European Business", body: "Extend through company-specific workspaces for manufacturing, HR and other complex operations." },
    ],
  },
  market: {
    eyebrow: "Customer focus · Europe",
    serifAccent: "operational reality.",
    headline: "Built around",
    items: [
      { tag: "Environment", value: "Windows", body: "Designed for organizations that operate Windows infrastructure and need local control." },
      { tag: "Knowledge", value: "Governed", body: "For teams whose procedures, evidence and operational context require accountable access." },
      { tag: "Adoption", value: "Focused", body: "Start with a defined domain, then enable licensed products as operational needs grow." },
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
    body: "OPSQAI baut eine souveräne operative KI-Ebene für Organisationen mit komplexer oder regulierter Arbeit — von Banken und Finanzdienstleistern bis Logistik, Fertigung und Personalwesen.",
    ctaPrimary: "Mit den Gründern sprechen",
    ctaSecondary: "Produkt ansehen",
  },
  principles: {
    eyebrow: "Mission · Vision · Warum jetzt",
    serifAccent: "arbeiten.",
    headline: "Die Prinzipien, nach denen wir",
    items: [
      { title: "Mission", body: "Wir bringen governance-fähige KI zu den Menschen, die kritische Arbeit leisten — ohne sensibles Wissen öffentlichen Cloud-LLMs zu überlassen." },
      { title: "Vision", body: "Jede Organisation kann einen operativen KI-Workspace um ihre eigenen Probleme gestalten. KI unterstützt Menschen und ersetzt keine verantwortlichen Entscheidungen." },
      { title: "Warum jetzt", body: "Banken, Logistiker und andere regulierte Unternehmen brauchen schnelleren Wissenszugang ohne Verlust von Eigentum, Governance oder Datensouveränität." },
    ],
  },
  team: {
    eyebrow: "Team · Bewusst",
    serifAccent: "übertrieben.",
    headline: "Klein.  Nie",
    intro: "Gründergeführt, produktorientiert und im direkten Austausch mit Kunden.",
    members: [
      {
        name: "Ștefan Bari",
        role: "Gründer & CEO / Inhaber",
        body: "Verantwortet Produktrichtung, Kundenbeziehungen und Unternehmensstrategie. Treibt den problemorientierten Ansatz für regulierte und operativ komplexe Organisationen voran.",
      },
    ],
  },
  gtm: {
    eyebrow: "Markteinführung",
    serifAccent: "das regulierte Europa.",
    headline: "Mit einem Problem starten. Wachsen in",
    phases: [
      { tag: "Phase 01", title: "Logistik & Operations", body: "Konkrete Wissens-, Schulungs- und Kontrollprobleme in Logistik, Transport und operativen Teams lösen." },
      { tag: "Phase 02", title: "Banken & Finanzdienstleister", body: "Interne Verfahren, Lernen und Nachweise dort unterstützen, wo menschliche Entscheidungen, Auditierbarkeit und Datengrenzen zählen." },
      { tag: "Phase 03", title: "Regulierte Unternehmen in Europa", body: "Mit unternehmensspezifischen Workspaces auf Fertigung, HR und weitere komplexe Abläufe erweitern." },
    ],
  },
  market: {
    eyebrow: "Kundenfokus · Europa",
    serifAccent: "operative Realität.",
    headline: "Gebaut für",
    items: [
      { tag: "Umgebung", value: "Windows", body: "Für Organisationen mit Windows-Infrastruktur und dem Bedarf an lokaler Kontrolle." },
      { tag: "Wissen", value: "Governed", body: "Für Teams, deren Verfahren, Nachweise und Kontext einen nachvollziehbaren Zugriff erfordern." },
      { tag: "Einführung", value: "Fokussiert", body: "Mit einem Bereich starten und lizenzierte Produkte bei wachsendem Bedarf aktivieren." },
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

const ro: Copy = {
  hero: {
    eyebrow: "Companie · Made in Europe",
    serifAccent: "nu în locul lor.",
    headline: "AI care lucrează pentru oameni.",
    body: "OPSQAI construiește un strat suveran de AI operațional pentru organizații cu activitate complexă sau reglementată — de la bănci și servicii financiare la logistică, producție și HR.",
    ctaPrimary: "Discută cu fondatorii",
    ctaSecondary: "Vezi produsul",
  },
  principles: {
    eyebrow: "Misiune · Viziune · De ce acum",
    serifAccent: "operăm.",
    headline: "Principiile după care",
    items: [
      { title: "Misiune", body: "Aducem AI guvernat oamenilor care desfășoară activități critice, fără ca organizația să predea cunoștințe sensibile către LLM-uri publice." },
      { title: "Viziune", body: "Fiecare organizație își poate modela un workspace de AI operațional în jurul propriilor probleme. AI-ul sprijină oamenii și nu înlocuiește deciziile responsabile." },
      { title: "De ce acum", body: "Băncile, operatorii logistici și alte afaceri reglementate au nevoie de acces rapid la cunoștințe fără să piardă proprietatea, guvernanța sau suveranitatea datelor." },
    ],
  },
  team: {
    eyebrow: "Echipă · Deliberat",
    serifAccent: "exagerată.",
    headline: "Mică. Niciodată",
    intro: "Condusă de fondator, concentrată pe produs și în dialog direct cu clienții.",
    members: [
      {
        name: "Ștefan Bari",
        role: "Fondator & CEO / Proprietar",
        body: "Deține direcția produsului, relațiile cu clienții și strategia comercială. Conduce abordarea OPSQAI centrată pe problemă pentru organizații reglementate și operațional complexe.",
      },
    ],
  },
  gtm: {
    eyebrow: "Strategie de piață",
    serifAccent: "Europa reglementată.",
    headline: "Începem cu o problemă. Extindere în",
    phases: [
      { tag: "Faza 01", title: "Logistică & Operațiuni", body: "Rezolvăm probleme concrete de cunoștințe, instruire și control în logistică, transport și echipe operaționale." },
      { tag: "Faza 02", title: "Bănci & Servicii Financiare", body: "Sprijinim proceduri interne, instruire și dovezi acolo unde decizia umană, auditabilitatea și granița datelor sunt esențiale." },
      { tag: "Faza 03", title: "Afaceri europene reglementate", body: "Extindem prin workspace-uri specifice companiei pentru producție, HR și alte operațiuni complexe." },
    ],
  },
  market: {
    eyebrow: "Focus client · Europa",
    serifAccent: "realitatea operațională.",
    headline: "Construit pentru",
    items: [
      { tag: "Mediu", value: "Windows", body: "Pentru organizații care operează infrastructură Windows și au nevoie de control local." },
      { tag: "Cunoștințe", value: "Guvernate", body: "Pentru echipe ale căror proceduri, dovezi și context cer acces responsabil și verificabil." },
      { tag: "Adopție", value: "Focalizată", body: "Începeți cu un domeniu definit și activați produse licențiate pe măsură ce nevoile cresc." },
    ],
  },
  cta: {
    eyebrow: "Construit în Europa",
    serifAccent: "mediul tău Windows.",
    headline: "Implementat în",
    body: "Discută cu noi despre o instalare de referință, un parteneriat sau o demonstrație a produsului Windows Self-Hosted.",
    ctaPrimary: "Contactează OPSQAI",
    ctaSecondary: "Vezi produsul Self-Hosted",
  },
};

export function useCompanyCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
