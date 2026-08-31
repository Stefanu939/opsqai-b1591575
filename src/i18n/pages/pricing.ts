// Public pricing copy — mirrors the real product architecture:
//   OPSQAI Core Platform (included) + Domain Products + Optional Add-ons
//   + Annual Maintenance.
// No "Basic / Business / Enterprise" packages, no module marketplace, and no
// invented prices: every deployment is quoted individually.
import { useT } from "@/i18n";

const en = {
  hero: {
    eyebrow: "Pricing · No SaaS",
    headline: "Own the platform.",
    serifAccent: "pay for what you enable.",
    body: "OPSQAI is not a SaaS. You license the OPSQAI Core Platform once for your installation, enable the domain products your business actually needs, and keep the installation healthy with Annual Maintenance.",
  },
  tiers: {
    eyebrow: "How OPSQAI is licensed",
    headline: "A model that maps to",
    serifAccent: "your business.",
    items: [
      {
        name: "OPSQAI Core Platform",
        tag: "One-time · Perpetual · Included",
        body: "The platform itself: AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Knowledge Gaps, SOP versioning, Internal Requests, Internal Chat, Reports, Support Center, Compliance Center, Enterprise Export, Workspace Health, RBAC, multi-language and notifications. Never priced item by item.",
        bullets: [
          "Perpetual, per-installation license",
          "Windows Self-Hosted",
          "Customer-owned AI provider",
          "Access governed by roles and permissions",
        ],
        cta: "Request pricing",
      },
      {
        name: "OPSQAI Products",
        tag: "Per domain · Enabled by OPSQAI",
        body: "Domain solutions on top of Core. OPSQAI Operations and OPSQAI Logistics are available today; OPSQAI Transport, HR, Finance and Inventory follow. A product is enabled for your company and delivered through your signed license — no reinstall.",
        bullets: [
          "Chosen from your company profile",
          "Signed product entitlements",
          "Enabled and disabled by OPSQAI",
          "No downtime, no data movement",
        ],
        cta: "See products",
      },
      {
        name: "Optional add-ons",
        tag: "Genuinely optional",
        body: "Extras that not every organisation needs: Analytics, Executive Dashboard, Brand Center, AI SOP Generator and AI Workspace Audit. Everything else is part of Core.",
        bullets: [
          "Only truly optional capabilities",
          "Signed add-on entitlements",
          "Add or remove at any time",
          "Enforced server-side, not by the UI",
        ],
        cta: "Talk to sales",
      },
      {
        name: "Annual Maintenance",
        tag: "Recurring · Yearly",
        body: "Signed updates and security releases, priority support with defined response targets, compatibility guarantees, and ownership continuity.",
        bullets: [
          "Signed releases and updates",
          "Support with response targets",
          "Compatibility guaranteed",
          "Managed by OPSQAI",
        ],
        cta: "Talk to sales",
      },
    ],
    footnote:
      "Pricing depends on company size, the products you enable and the maintenance scope · every deployment quoted individually",
  },
  faq: {
    eyebrow: "Frequently asked",
    headline: "Answered",
    serifAccent: "honestly.",
    items: [
      {
        question: "Is OPSQAI a SaaS product?",
        answer:
          "No. OPSQAI is a Windows Self-Hosted platform. You license the Core Platform once for your installation, enable the products your business needs, and keep it running under an annual maintenance contract. There is no monthly per-seat cloud subscription.",
      },
      {
        question: "What does the OPSQAI Core Platform include?",
        answer:
          "Every platform capability: AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Knowledge Gaps, SOP versioning, Internal Requests, Internal Chat, Reports, Support Center, Compliance Center, Enterprise Export, Workspace Health, RBAC, multi-language and notifications. These are never sold individually — access is controlled by roles and permissions.",
      },
      {
        question: "What is an OPSQAI product?",
        answer:
          "A domain solution such as OPSQAI Logistics: the workspaces and workflows for one business area. Your company profile determines which products are relevant; OPSQAI enables the ones you buy and delivers them as signed entitlements in your license.",
      },
      {
        question: "What is Annual Maintenance?",
        answer:
          "Annual Maintenance covers signed updates, security releases, support with defined response targets, compatibility guarantees and ownership continuity.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Fixed quote · one page",
    headline: "Request your",
    serifAccent: "pricing.",
    body: "Tell us about your operation — company size, business domain and the products you need. We come back with a fixed quote.",
    ctaPrimary: "Request pricing",
    ctaSecondary: "See products",
  },
};

type Copy = typeof en;

const de: Copy = {
  hero: {
    eyebrow: "Preise · Kein SaaS",
    headline: "Besitzen Sie die Plattform.",
    serifAccent: "zahlen Sie für das, was Sie aktivieren.",
    body: "OPSQAI ist kein SaaS. Sie lizenzieren die OPSQAI Core-Plattform einmalig für Ihre Installation, aktivieren die Fachprodukte, die Ihr Unternehmen wirklich braucht, und halten die Installation mit einem jährlichen Wartungsvertrag gesund.",
  },
  tiers: {
    eyebrow: "So wird OPSQAI lizenziert",
    headline: "Ein Modell, das zu",
    serifAccent: "Ihrem Geschäft passt.",
    items: [
      {
        name: "OPSQAI Core-Plattform",
        tag: "Einmalig · Unbefristet · Enthalten",
        body: "Die Plattform selbst: KI-Chat, Wissensdatenbank, FAQ, Academy, KI-Audit, Wissenslücken, SOP-Versionierung, interne Anfragen, interner Chat, Berichte, Support-Center, Compliance-Center, Enterprise-Export, Workspace-Health, RBAC, Mehrsprachigkeit und Benachrichtigungen. Wird nie einzeln bepreist.",
        bullets: [
          "Unbefristete Lizenz pro Installation",
          "Windows Self-Hosted",
          "KI-Anbieter im Besitz des Kunden",
          "Zugriff über Rollen und Berechtigungen",
        ],
        cta: "Preis anfragen",
      },
      {
        name: "OPSQAI Produkte",
        tag: "Pro Fachbereich · Von OPSQAI aktiviert",
        body: "Fachlösungen auf Basis von Core. OPSQAI Operations und OPSQAI Logistics sind heute verfügbar; OPSQAI Transport, HR, Finance und Inventory folgen. Ein Produkt wird für Ihr Unternehmen aktiviert und über Ihre signierte Lizenz ausgeliefert — ohne Neuinstallation.",
        bullets: [
          "Ausgewählt anhand Ihres Unternehmensprofils",
          "Signierte Produktberechtigungen",
          "Von OPSQAI aktiviert und deaktiviert",
          "Keine Ausfallzeit, keine Datenmigration",
        ],
        cta: "Produkte ansehen",
      },
      {
        name: "Optionale Add-ons",
        tag: "Wirklich optional",
        body: "Erweiterungen, die nicht jedes Unternehmen benötigt: Analytics, Executive Dashboard, Brand Center, KI-SOP-Generator und KI-Workspace-Audit. Alles andere ist Teil von Core.",
        bullets: [
          "Nur wirklich optionale Funktionen",
          "Signierte Add-on-Berechtigungen",
          "Jederzeit hinzufügbar oder entfernbar",
          "Serverseitig erzwungen, nicht per UI",
        ],
        cta: "Vertrieb kontaktieren",
      },
      {
        name: "Jährliche Wartung",
        tag: "Wiederkehrend · Jährlich",
        body: "Signierte Updates und Sicherheitsreleases, priorisierter Support mit definierten Reaktionszeiten, Kompatibilitätsgarantien und Eigentumskontinuität.",
        bullets: [
          "Signierte Releases und Updates",
          "Support mit Reaktionszeiten",
          "Kompatibilität garantiert",
          "Von OPSQAI betreut",
        ],
        cta: "Vertrieb kontaktieren",
      },
    ],
    footnote:
      "Der Preis richtet sich nach Unternehmensgröße, den aktivierten Produkten und dem Wartungsumfang · jede Installation wird individuell kalkuliert",
  },
  faq: {
    eyebrow: "Häufige Fragen",
    headline: "Ehrlich",
    serifAccent: "beantwortet.",
    items: [
      {
        question: "Ist OPSQAI ein SaaS-Produkt?",
        answer:
          "Nein. OPSQAI ist eine Windows-Self-Hosted-Plattform. Sie lizenzieren die Core-Plattform einmalig für Ihre Installation, aktivieren die benötigten Produkte und betreiben sie im Rahmen eines jährlichen Wartungsvertrags. Es gibt kein monatliches Cloud-Abonnement pro Nutzer.",
      },
      {
        question: "Was umfasst die OPSQAI Core-Plattform?",
        answer:
          "Alle Plattformfunktionen: KI-Chat, Wissensdatenbank, FAQ, Academy, KI-Audit, Wissenslücken, SOP-Versionierung, interne Anfragen, interner Chat, Berichte, Support-Center, Compliance-Center, Enterprise-Export, Workspace-Health, RBAC, Mehrsprachigkeit und Benachrichtigungen. Diese werden nie einzeln verkauft — der Zugriff wird über Rollen und Berechtigungen gesteuert.",
      },
      {
        question: "Was ist ein OPSQAI-Produkt?",
        answer:
          "Eine Fachlösung wie OPSQAI Logistics: die Arbeitsbereiche und Workflows eines Geschäftsbereichs. Ihr Unternehmensprofil bestimmt, welche Produkte relevant sind; OPSQAI aktiviert die gekauften Produkte und liefert sie als signierte Berechtigungen in Ihrer Lizenz.",
      },
      {
        question: "Was ist die jährliche Wartung?",
        answer:
          "Die jährliche Wartung umfasst signierte Updates, Sicherheitsreleases, Support mit definierten Reaktionszeiten, Kompatibilitätsgarantien und Eigentumskontinuität.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Festpreis · eine Seite",
    headline: "Fordern Sie Ihr",
    serifAccent: "Angebot an.",
    body: "Erzählen Sie uns von Ihrem Betrieb — Unternehmensgröße, Fachbereich und benötigte Produkte. Wir antworten mit einem Festpreisangebot.",
    ctaPrimary: "Preis anfragen",
    ctaSecondary: "Produkte ansehen",
  },
};

const ro: Copy = {
  hero: {
    eyebrow: "Prețuri · Fără SaaS",
    headline: "Dețineți platforma.",
    serifAccent: "plătiți ce activați.",
    body: "OPSQAI nu este un SaaS. Licențiați Platforma Core OPSQAI o singură dată pentru instalarea dumneavoastră, activați produsele de domeniu de care are nevoie afacerea și mențineți instalarea sănătoasă printr-un contract anual de mentenanță.",
  },
  tiers: {
    eyebrow: "Cum se licențiază OPSQAI",
    headline: "Un model potrivit cu",
    serifAccent: "afacerea dumneavoastră.",
    items: [
      {
        name: "Platforma Core OPSQAI",
        tag: "O singură dată · Perpetuu · Inclus",
        body: "Platforma în sine: Chat AI, Bază de cunoștințe, FAQ, Academy, Audit AI, Lacune de cunoștințe, versionare SOP, Cereri interne, Chat intern, Rapoarte, Centru de suport, Centru de conformitate, Export enterprise, Sănătatea spațiului de lucru, RBAC, multilingvism și notificări. Nu se tarifează niciodată element cu element.",
        bullets: [
          "Licență perpetuă, per instalare",
          "Windows Self-Hosted",
          "Furnizor AI deținut de client",
          "Acces guvernat de roluri și permisiuni",
        ],
        cta: "Solicitați prețul",
      },
      {
        name: "Produse OPSQAI",
        tag: "Per domeniu · Activate de OPSQAI",
        body: "Soluții de domeniu peste Core. OPSQAI Operations și OPSQAI Logistics sunt disponibile astăzi; OPSQAI Transport, HR, Finance și Inventory urmează. Un produs este activat pentru compania dumneavoastră și livrat prin licența semnată — fără reinstalare.",
        bullets: [
          "Alese pe baza profilului companiei",
          "Drepturi de produs semnate",
          "Activate și dezactivate de OPSQAI",
          "Fără întreruperi, fără mutarea datelor",
        ],
        cta: "Vedeți produsele",
      },
      {
        name: "Add-on-uri opționale",
        tag: "Cu adevărat opționale",
        body: "Extra care nu sunt necesare fiecărei organizații: Analytics, Executive Dashboard, Brand Center, Generator SOP AI și Audit AI al spațiului de lucru. Restul face parte din Core.",
        bullets: [
          "Doar capabilități cu adevărat opționale",
          "Drepturi de add-on semnate",
          "Se adaugă sau se retrag oricând",
          "Impuse pe server, nu de interfață",
        ],
        cta: "Contactați vânzările",
      },
      {
        name: "Mentenanță anuală",
        tag: "Recurent · Anual",
        body: "Actualizări și versiuni de securitate semnate, suport prioritar cu ținte de răspuns definite, garanții de compatibilitate și continuitatea proprietății.",
        bullets: [
          "Versiuni și actualizări semnate",
          "Suport cu ținte de răspuns",
          "Compatibilitate garantată",
          "Administrat de OPSQAI",
        ],
        cta: "Contactați vânzările",
      },
    ],
    footnote:
      "Prețul depinde de dimensiunea companiei, produsele activate și amploarea mentenanței · fiecare implementare este cotată individual",
  },
  faq: {
    eyebrow: "Întrebări frecvente",
    headline: "Răspuns",
    serifAccent: "onest.",
    items: [
      {
        question: "OPSQAI este un produs SaaS?",
        answer:
          "Nu. OPSQAI este o platformă Windows Self-Hosted. Licențiați Platforma Core o singură dată pentru instalarea dumneavoastră, activați produsele necesare și o mențineți printr-un contract anual de mentenanță. Nu există abonament lunar per utilizator în cloud.",
      },
      {
        question: "Ce include Platforma Core OPSQAI?",
        answer:
          "Toate capabilitățile platformei: Chat AI, Bază de cunoștințe, FAQ, Academy, Audit AI, Lacune de cunoștințe, versionare SOP, Cereri interne, Chat intern, Rapoarte, Centru de suport, Centru de conformitate, Export enterprise, Sănătatea spațiului de lucru, RBAC, multilingvism și notificări. Nu se vând individual — accesul este controlat de roluri și permisiuni.",
      },
      {
        question: "Ce este un produs OPSQAI?",
        answer:
          "O soluție de domeniu, precum OPSQAI Logistics: spațiile de lucru și fluxurile unei arii de business. Profilul companiei determină ce produse sunt relevante; OPSQAI activează produsele achiziționate și le livrează ca drepturi semnate în licență.",
      },
      {
        question: "Ce este mentenanța anuală?",
        answer:
          "Mentenanța anuală acoperă actualizări semnate, versiuni de securitate, suport cu ținte de răspuns definite, garanții de compatibilitate și continuitatea proprietății.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Ofertă fixă · o pagină",
    headline: "Solicitați",
    serifAccent: "prețul.",
    body: "Spuneți-ne despre operațiunea dumneavoastră — dimensiunea companiei, domeniul de business și produsele necesare. Revenim cu o ofertă fixă.",
    ctaPrimary: "Solicitați prețul",
    ctaSecondary: "Vedeți produsele",
  },
};

export function usePricingCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
