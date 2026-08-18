// Marketing-site copy (OIX surfaces) in English + German.
// Used by the OIX nav, footer and marketing pages so the language
// switcher actually translates the page, not just labels.

import { useT } from "@/i18n";

const en = {
  nav: {
    product: "Product",
    overview: "Overview",
    modules: "Modules",
    selfHosted: "Self-Hosted",
    security: "Security",
    pricing: "Pricing",
    company: "Company",
    documentation: "Documentation",
    blog: "Blog",
    contact: "Contact",
  },
  cta: {
    proposal: "Request Proposal",
    signIn: "Sign in",
    portal: "Customer Portal",
    howItWorks: "How it works",
    requestDemo: "Request demo",
    contactSales: "Contact sales",
    selfHostedDetails: "Self-hosted details",
  },
  a11y: {
    language: "Change language",
    theme: "Switch theme",
  },
  footer: {
    platform: "Platform",
    company: "Company",
    resources: "Resources",
    legal: "Legal",
    about: "About",
    support: "Support",
    firstRun: "First Run",
    privacy: "Privacy",
    terms: "Terms",
    imprint: "Imprint",
    rights: "Operational Intelligence Experience",
    motto: "Powered by your knowledge — not ours.",
  },
  home: {
    eyebrow: "Enterprise Operational Intelligence",
    h1a: "The operating system",
    h1b: "for operational knowledge —",
    serif: "for people.",
    intro:
      "OPSQAI is a Windows Self-Hosted platform that brings governed AI to industrial operations. Sovereign by design. Customers own their data, documents, embeddings and AI provider. We never see operational knowledge — and we built it that way on purpose, because it's",
    introEm: "not without them",
  },
  product: {
    eyebrow: "Product · One platform",
    title: "One product.",
    serif: "Three surfaces.",
    intro:
      "OPSQAI is a Windows Self-Hosted product. The two cloud surfaces — Management Center and Customer Portal — exist only to support the installation. Employees never work inside the cloud; they work inside their own installation.",
    guaranteeEyebrow: "The boundary",
    guaranteeStrong: "The product is the Windows installation.",
    guarantee:
      "OPSQAI Cloud is used only for licensing, releases, installer distribution, customer support, the Customer Portal and the Management Center.",
    surfacesEyebrow: "The three surfaces",
    surfaces: [
      {
        name: "Management Center",
        who: "OPSQAI staff only",
        tag: "Cloud",
        what: "Internal control plane. Companies, customers, installations, licenses, releases, signing keys, activation bundles, contracts, support, ownership, portal administration, audit and system health. Never sold, never installed, never accessed by customers.",
      },
      {
        name: "Customer Portal",
        who: "Customer contacts",
        tag: "Cloud",
        what: "Service surface at opsqai.de. Download the installer and updates, retrieve the activation bundle, read documentation and release notes, see subscription information and open support tickets. Not the product — a service layer around it.",
      },
      {
        name: "Self-Hosted",
        who: "End users, every day",
        tag: "Windows · The product",
        what: "The Windows Self-Hosted installation is the product. AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization, Subscription, Updates and Modules — running inside the customer's own Windows Server.",
      },
    ],
    journeyEyebrow: "Delivery",
    journeyTitle: "From purchase to production",
    journeyIntro:
      "No SaaS subscription. A one-time Basic Platform, premium modules purchased separately, and Annual Maintenance.",
    journey: [
      { title: "Purchase", body: "Order the Basic Platform and any premium modules through OPSQAI." },
      { title: "Download package", body: "Retrieve the signed Windows installation package from the Customer Portal." },
      { title: "Run installer", body: "The installer provisions PostgreSQL, storage, services and Caddy on Windows Server." },
      { title: "Activate license", body: "Paste the Ed25519-signed license bundle issued by OPSQAI. Modules unlock as licensed." },
      { title: "Configure AI", body: "Choose the AI provider — OpenAI, Azure OpenAI, Ollama, OpenRouter or a compatible endpoint." },
      { title: "Start using OPSQAI", body: "Invite users, ingest SOPs and answer operational questions with grounded citations." },
    ],
    ctaTitle: "Ready to see the architecture live?",
    ctaBody: "Talk to us about a reference install of the Windows Self-Hosted product.",
  },
};

type MarketingCopy = typeof en;

const de: MarketingCopy = {
  nav: {
    product: "Produkt",
    modules: "Module",
    selfHosted: "Self-Hosted",
    security: "Sicherheit",
    pricing: "Preise",
    company: "Unternehmen",
    documentation: "Dokumentation",
    blog: "Blog",
    contact: "Kontakt",
  },
  cta: {
    proposal: "Angebot anfordern",
    signIn: "Anmelden",
    portal: "Kundenportal",
    howItWorks: "So funktioniert es",
    requestDemo: "Demo anfragen",
    contactSales: "Vertrieb kontaktieren",
    selfHostedDetails: "Self-Hosted-Details",
  },
  a11y: {
    language: "Sprache wechseln",
    theme: "Design wechseln",
  },
  footer: {
    platform: "Plattform",
    company: "Unternehmen",
    resources: "Ressourcen",
    legal: "Rechtliches",
    about: "Über uns",
    support: "Support",
    firstRun: "Erstinbetriebnahme",
    privacy: "Datenschutz",
    terms: "AGB",
    imprint: "Impressum",
    rights: "Operational Intelligence Experience",
    motto: "Angetrieben von Ihrem Wissen — nicht von unserem.",
  },
  home: {
    eyebrow: "Operative Intelligenz für Unternehmen",
    h1a: "Das Betriebssystem",
    h1b: "für operatives Wissen —",
    serif: "für Menschen.",
    intro:
      "OPSQAI ist eine Windows-Self-Hosted-Plattform, die governance-fähige KI in industrielle Abläufe bringt. Souverän von Grund auf: Kunden besitzen ihre Daten, Dokumente, Embeddings und ihren KI-Anbieter. Wir sehen operatives Wissen nie — und das ist bewusst so gebaut, denn es geht",
    introEm: "nicht ohne die Menschen",
  },
  product: {
    eyebrow: "Produkt · Eine Plattform",
    title: "Ein Produkt.",
    serif: "Drei Oberflächen.",
    intro:
      "OPSQAI ist ein Windows-Self-Hosted-Produkt. Die beiden Cloud-Oberflächen — Management Center und Kundenportal — existieren ausschließlich zur Unterstützung der Installation. Mitarbeitende arbeiten niemals in der Cloud, sondern in ihrer eigenen Installation.",
    guaranteeEyebrow: "Die Grenze",
    guaranteeStrong: "Das Produkt ist die Windows-Installation.",
    guarantee:
      "Die OPSQAI Cloud dient nur der Lizenzierung, den Releases, der Installer-Verteilung, dem Kundensupport, dem Kundenportal und dem Management Center.",
    surfacesEyebrow: "Die drei Oberflächen",
    surfaces: [
      {
        name: "Management Center",
        who: "Nur OPSQAI-Team",
        tag: "Cloud",
        what: "Interne Steuerungsebene. Firmen, Kunden, Installationen, Lizenzen, Releases, Signaturschlüssel, Aktivierungspakete, Verträge, Support, Eigentümerschaft, Portalverwaltung, Audit und Systemzustand. Wird nie verkauft, nie installiert und ist für Kunden nicht zugänglich.",
      },
      {
        name: "Kundenportal",
        who: "Ansprechpartner der Kunden",
        tag: "Cloud",
        what: "Service-Oberfläche unter opsqai.de. Installer und Updates herunterladen, Aktivierungspaket abrufen, Dokumentation und Release Notes lesen, Abonnementdaten einsehen und Support-Tickets eröffnen. Kein Produkt — eine Serviceschicht darum.",
      },
      {
        name: "Self-Hosted",
        who: "Endnutzer, täglich",
        tag: "Windows · Das Produkt",
        what: "Die Windows-Self-Hosted-Installation ist das Produkt. KI-Chat, Wissensdatenbank, FAQ, Academy, KI-Audit, Benutzer, Organisation, Abonnement, Updates und Module — laufen im eigenen Windows Server des Kunden.",
      },
    ],
    journeyEyebrow: "Auslieferung",
    journeyTitle: "Vom Kauf bis zum Produktivbetrieb",
    journeyIntro:
      "Kein SaaS-Abo. Eine einmalige Basisplattform, Premium-Module separat erworben, plus jährliche Wartung.",
    journey: [
      { title: "Kauf", body: "Basisplattform und gewünschte Premium-Module über OPSQAI bestellen." },
      { title: "Paket herunterladen", body: "Signiertes Windows-Installationspaket im Kundenportal abrufen." },
      { title: "Installer ausführen", body: "Der Installer richtet PostgreSQL, Storage, Dienste und Caddy auf dem Windows Server ein." },
      { title: "Lizenz aktivieren", body: "Das von OPSQAI ausgestellte Ed25519-signierte Lizenzpaket einfügen. Module werden gemäß Lizenz freigeschaltet." },
      { title: "KI konfigurieren", body: "KI-Anbieter wählen — OpenAI, Azure OpenAI, Ollama, OpenRouter oder einen kompatiblen Endpunkt." },
      { title: "OPSQAI nutzen", body: "Benutzer einladen, SOPs einlesen und operative Fragen mit belegten Quellen beantworten." },
    ],
    ctaTitle: "Bereit, die Architektur live zu sehen?",
    ctaBody: "Sprechen Sie mit uns über eine Referenzinstallation des Windows-Self-Hosted-Produkts.",
  },
};

export const marketingCopy = { en, de };

export function useMarketing(): MarketingCopy {
  const { lang } = useT();
  return marketingCopy[lang] ?? en;
}
