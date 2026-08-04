import { useT } from "@/i18n";

const en = {
  hero: {
    eyebrow: "Pricing · No SaaS",
    headline: "Own the platform.",
    serifAccent: "pay for what you use.",
    body: "OPSQAI is not a SaaS. You purchase the Basic Platform once, activate premium modules as you need them, and keep the installation healthy with Annual Maintenance.",
  },
  tiers: {
    eyebrow: "Three components",
    headline: "A model that",
    serifAccent: "one purchase.",
    items: [
      {
        name: "Basic Platform",
        tag: "One-time · Perpetual",
        body: "AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization and Subscription. Windows installer, signed license and initial setup included.",
        bullets: [
          "Perpetual, per-installation license",
          "Windows Self-Hosted",
          "Customer-owned AI provider",
          "Signed installer and license",
        ],
        cta: "Request pricing",
      },
      {
        name: "Premium Modules",
        tag: "One-time · Per module",
        body: "Activate additional capabilities on top of the Basic Platform. Each module is licensed separately and activated by OPSQAI through a signed license — no reinstall required.",
        bullets: [
          "Signed module licenses",
          "Activated by OPSQAI",
          "No cross-module dependencies",
          "No downtime, no data movement",
        ],
        cta: "Browse modules",
      },
      {
        name: "Annual Maintenance",
        tag: "Recurring · Yearly",
        body: "Signed updates and security releases, priority support with defined response targets, module compatibility guarantees, and ownership continuity.",
        bullets: [
          "Signed releases and updates",
          "Support with response targets",
          "Compatibility guaranteed",
          "Managed by OPSQAI",
        ],
        cta: "Talk to sales",
      },
    ],
    footnote: "Pricing depends on company size, selected premium modules and the maintenance tier · every deployment quoted individually",
  },
  faq: {
    eyebrow: "Frequently asked",
    headline: "Answered",
    serifAccent: "honestly.",
    items: [
      {
        question: "Is OPSQAI a SaaS product?",
        answer: "No. OPSQAI is a Windows Self-Hosted product. You buy the Basic Platform once, add premium modules as needed, and keep it running under an annual maintenance contract. There is no monthly per-seat cloud subscription.",
      },
      {
        question: "What does the Basic Platform include?",
        answer: "AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization and Subscription. It runs on the customer's Windows Server with the customer's chosen AI provider.",
      },
      {
        question: "How are premium modules priced?",
        answer: "Each premium module is licensed separately. Pricing depends on the module, scope and installation size. Activation is issued by OPSQAI as a signed module license — no reinstall required.",
      },
      {
        question: "What is Annual Maintenance?",
        answer: "Annual Maintenance covers signed updates, security releases, support with defined response targets, module compatibility guarantees and ownership continuity.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Fixed quote · one page",
    headline: "Request your",
    serifAccent: "pricing.",
    body: "Tell us about your operation — company size, target modules and maintenance needs. We come back with a fixed quote.",
    ctaPrimary: "Request pricing",
    ctaSecondary: "Browse modules",
  },
};

type Copy = typeof en;

const de: Copy = {
  hero: {
    eyebrow: "Preise · Kein SaaS",
    headline: "Besitzen Sie die Plattform.",
    serifAccent: "zahlen Sie, was Sie nutzen.",
    body: "OPSQAI ist kein SaaS. Sie erwerben die Basic Platform einmalig, aktivieren bei Bedarf Premium-Module und halten die Installation mit einem Wartungsvertrag gesund.",
  },
  tiers: {
    eyebrow: "Drei Komponenten",
    headline: "Ein Modell, das",
    serifAccent: "ein einmaliger Kauf.",
    items: [
      {
        name: "Basic Platform",
        tag: "Einmalig · Unbefristet",
        body: "AI Chat, Wissensdatenbank, FAQ, Academy, KI-Audit, Nutzer, Organisation und Abonnement. Windows-Installer, signierte Lizenz und Ersteinrichtung inklusive.",
        bullets: [
          "Unbefristete Lizenz pro Installation",
          "Windows Self-Hosted",
          "Eigener KI-Anbieter des Kunden",
          "Signierter Installer und Lizenz",
        ],
        cta: "Preis anfragen",
      },
      {
        name: "Premium-Module",
        tag: "Einmalig · Pro Modul",
        body: "Aktivieren Sie zusätzliche Funktionen auf der Basic Platform. Jedes Modul wird separat lizenziert und von OPSQAI über eine signierte Lizenz aktiviert — keine Neuinstallation nötig.",
        bullets: [
          "Signierte Modullizenzen",
          "Aktiviert von OPSQAI",
          "Keine modulübergreifenden Abhängigkeiten",
          "Kein Ausfall, keine Datenmigration",
        ],
        cta: "Module ansehen",
      },
      {
        name: "Jährliche Wartung",
        tag: "Wiederkehrend · Jährlich",
        body: "Signierte Updates und Sicherheitsreleases, priorisierter Support mit definierten Reaktionszeiten, Kompatibilitätsgarantien für Module und Kontinuität des Eigentums.",
        bullets: [
          "Signierte Releases und Updates",
          "Support mit Reaktionszeiten",
          "Kompatibilität garantiert",
          "Verwaltet von OPSQAI",
        ],
        cta: "Vertrieb kontaktieren",
      },
    ],
    footnote: "Der Preis hängt von der Unternehmensgröße, den gewählten Premium-Modulen und der Wartungsstufe ab · jede Implementierung wird individuell kalkuliert",
  },
  faq: {
    eyebrow: "Häufige Fragen",
    headline: "Ehrlich",
    serifAccent: "beantwortet.",
    items: [
      {
        question: "Ist OPSQAI ein SaaS-Produkt?",
        answer: "Nein. OPSQAI ist ein Windows Self-Hosted-Produkt. Sie kaufen die Basic Platform einmalig, fügen bei Bedarf Premium-Module hinzu und betreiben sie im Rahmen eines jährlichen Wartungsvertrags. Es gibt kein monatliches Cloud-Abonnement pro Nutzer.",
      },
      {
        question: "Was umfasst die Basic Platform?",
        answer: "AI Chat, Wissensdatenbank, FAQ, Academy, KI-Audit, Nutzer, Organisation und Abonnement. Sie läuft auf dem Windows Server des Kunden mit dem vom Kunden gewählten KI-Anbieter.",
      },
      {
        question: "Wie werden Premium-Module bepreist?",
        answer: "Jedes Premium-Modul wird separat lizenziert. Der Preis hängt vom Modul, dem Umfang und der Installationsgröße ab. Die Aktivierung erfolgt durch OPSQAI als signierte Modullizenz — keine Neuinstallation nötig.",
      },
      {
        question: "Was beinhaltet die jährliche Wartung?",
        answer: "Die jährliche Wartung umfasst signierte Updates, Sicherheitsreleases, Support mit definierten Reaktionszeiten, Kompatibilitätsgarantien für Module und Kontinuität des Eigentums.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Festpreisangebot · eine Seite",
    headline: "Fordern Sie Ihr",
    serifAccent: "Angebot an.",
    body: "Erzählen Sie uns von Ihrem Betrieb — Unternehmensgröße, Zielmodule und Wartungsbedarf. Wir melden uns mit einem Festpreisangebot.",
    ctaPrimary: "Preis anfragen",
    ctaSecondary: "Module ansehen",
  },
};

export function usePricingCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : en;
}
