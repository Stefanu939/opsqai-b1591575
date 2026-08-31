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


const ro: Copy = {
  hero: {
    eyebrow: "Prețuri · Fără SaaS",
    headline: "Dețineți platforma.",
    serifAccent: "plătiți doar ce folosiți.",
    body: "OPSQAI nu este un SaaS. Achiziționați Platforma Basic o singură dată, activați module Premium pe măsură ce aveți nevoie și mențineți instalarea sănătoasă printr-un contract de Mentenanță Anuală.",
  },
  tiers: {
    eyebrow: "Trei componente",
    headline: "Un model care",
    serifAccent: "o singură achiziție.",
    items: [
      {
        name: "Platforma Basic",
        tag: "Plată unică · Perpetuă",
        body: "AI Chat, Bază de Cunoștințe, FAQ, Academy, Audit AI, Utilizatori, Organizație și Abonament. Include instalator Windows, licență semnată și configurarea inițială.",
        bullets: [
          "Licență perpetuă, per instalare",
          "Windows Self-Hosted",
          "Furnizor AI ales de client",
          "Instalator și licență semnate",
        ],
        cta: "Solicitați o ofertă",
      },
      {
        name: "Module Premium",
        tag: "Plată unică · Per modul",
        body: "Activați funcționalități suplimentare peste Platforma Basic. Fiecare modul este licențiat separat și activat de OPSQAI printr-o licență semnată — fără reinstalare necesară.",
        bullets: [
          "Licențe de modul semnate",
          "Activate de OPSQAI",
          "Fără dependențe între module",
          "Fără întreruperi, fără migrare de date",
        ],
        cta: "Vedeți modulele",
      },
      {
        name: "Mentenanță Anuală",
        tag: "Recurent · Anual",
        body: "Actualizări și versiuni de securitate semnate, suport prioritar cu obiective de răspuns definite, garanții de compatibilitate a modulelor și continuitate a dreptului de utilizare.",
        bullets: [
          "Versiuni și actualizări semnate",
          "Suport cu obiective de răspuns",
          "Compatibilitate garantată",
          "Gestionată de OPSQAI",
        ],
        cta: "Discutați cu vânzările",
      },
    ],
    footnote: "Prețul depinde de dimensiunea companiei, modulele Premium alese și nivelul de mentenanță · fiecare implementare este ofertată individual",
  },
  faq: {
    eyebrow: "Întrebări frecvente",
    headline: "Răspunsuri",
    serifAccent: "sincere.",
    items: [
      {
        question: "OPSQAI este un produs SaaS?",
        answer: "Nu. OPSQAI este un produs Windows Self-Hosted. Achiziționați Platforma Basic o singură dată, adăugați module Premium după nevoie și o mențineți funcțională printr-un contract anual de mentenanță. Nu există abonament lunar per utilizator în cloud.",
      },
      {
        question: "Ce include Platforma Basic?",
        answer: "AI Chat, Bază de Cunoștințe, FAQ, Academy, Audit AI, Utilizatori, Organizație și Abonament. Rulează pe Windows Server-ul clientului, cu furnizorul AI ales de client.",
      },
      {
        question: "Cum sunt prețuite modulele Premium?",
        answer: "Fiecare modul Premium este licențiat separat. Prețul depinde de modul, de amploarea proiectului și de dimensiunea instalării. Activarea este emisă de OPSQAI ca licență de modul semnată — fără reinstalare necesară.",
      },
      {
        question: "Ce este Mentenanța Anuală?",
        answer: "Mentenanța Anuală acoperă actualizări semnate, versiuni de securitate, suport cu obiective de răspuns definite, garanții de compatibilitate a modulelor și continuitate a dreptului de utilizare.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Ofertă fixă · o singură pagină",
    headline: "Solicitați",
    serifAccent: "oferta dumneavoastră.",
    body: "Spuneți-ne despre activitatea dumneavoastră — dimensiunea companiei, modulele vizate și nevoile de mentenanță. Revenim cu o ofertă fixă.",
    ctaPrimary: "Solicitați o ofertă",
    ctaSecondary: "Vedeți modulele",
  },
};

export function usePricingCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
