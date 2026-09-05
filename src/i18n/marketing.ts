// Marketing-site copy (OIX surfaces) in English + German.
// Used by the OIX nav, footer and marketing pages so the language
// switcher actually translates the page, not just labels.

import { useT } from "@/i18n";

const en = {
  nav: {
    product: "Product",
    overview: "Overview",
    modules: "Platform",
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
    title: "One customer product.",
    serif: "Supported by OPSQAI Cloud.",
    intro:
      "OPSQAI is a Windows Self-Hosted product. The two cloud surfaces — Management Center and Customer Portal — exist only to support the installation. Employees never work inside the cloud; they work inside their own installation.",
    guaranteeEyebrow: "The boundary",
    guaranteeStrong: "The product is the Windows installation.",
    guarantee:
      "OPSQAI Cloud is used only for licensing, releases, installer distribution, customer support, the Customer Portal and the Management Center.",
    surfacesEyebrow: "Product and support services",
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
        what: "The Windows Self-Hosted installation is the product and the only place employees work. Core Platform: AI Chat, Knowledge Base, SOPs, FAQ, Academy, AI Audit, Knowledge Gaps, Calendar, Users & roles, Organization, License & Entitlements, Updates. On top of it, licensed OPSQAI products open domain workspaces — Operations, Quality & Compliance, Logistics, HR, Finance, Inventory — with the customer's own AI provider (Ollama for a fully local model) inside their Windows Server.",
      },
    ],
    journeyEyebrow: "Delivery",
    journeyTitle: "From purchase to production",
    journeyIntro:
      "No SaaS subscription. A one-time Core platform license, OPSQAI products per business domain, optional add-ons and Annual Maintenance.",
    journey: [
      { title: "Purchase", body: "Order the Core platform and the OPSQAI products you need through OPSQAI." },
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
    overview: "Überblick",
    modules: "Plattform",
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
    title: "Ein Kundenprodukt.",
    serif: "Unterstützt durch OPSQAI Cloud.",
    intro:
      "OPSQAI ist ein Windows-Self-Hosted-Produkt. Die beiden Cloud-Oberflächen — Management Center und Kundenportal — existieren ausschließlich zur Unterstützung der Installation. Mitarbeitende arbeiten niemals in der Cloud, sondern in ihrer eigenen Installation.",
    guaranteeEyebrow: "Die Grenze",
    guaranteeStrong: "Das Produkt ist die Windows-Installation.",
    guarantee:
      "Die OPSQAI Cloud dient nur der Lizenzierung, den Releases, der Installer-Verteilung, dem Kundensupport, dem Kundenportal und dem Management Center.",
    surfacesEyebrow: "Produkt und Support-Services",
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
        what: "Die Windows-Self-Hosted-Installation ist das Produkt und der einzige Ort, an dem Mitarbeitende arbeiten. Core-Plattform: KI-Chat, Wissensdatenbank, SOPs, FAQ, Academy, KI-Audit, Wissenslücken, Kalender, Benutzer & Rollen, Organisation, Lizenz & Entitlements, Updates. Darauf öffnen lizenzierte OPSQAI-Produkte Fach-Workspaces — Operations, Qualität & Compliance, Logistik, HR, Finanzen, Bestand — mit dem eigenen KI-Anbieter des Kunden (Ollama für ein vollständig lokales Modell) im eigenen Windows Server.",
      },
    ],
    journeyEyebrow: "Auslieferung",
    journeyTitle: "Vom Kauf bis zum Produktivbetrieb",
    journeyIntro:
      "Kein SaaS-Abo. Eine einmalige Core-Plattform-Lizenz, OPSQAI-Produkte je Fachbereich, optionale Add-ons plus jährliche Wartung.",
    journey: [
      { title: "Kauf", body: "Core-Plattform und die benötigten OPSQAI-Produkte über OPSQAI bestellen." },
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

const ro: MarketingCopy = {
  nav: {
    product: "Produs",
    overview: "Prezentare",
    modules: "Platformă",
    selfHosted: "Self-Hosted",
    security: "Securitate",
    pricing: "Prețuri",
    company: "Companie",
    documentation: "Documentație",
    blog: "Blog",
    contact: "Contact",
  },
  cta: {
    proposal: "Solicită o ofertă",
    signIn: "Autentificare",
    portal: "Portal client",
    howItWorks: "Cum funcționează",
    requestDemo: "Solicită demo",
    contactSales: "Contactează vânzările",
    selfHostedDetails: "Detalii self-hosted",
  },
  a11y: {
    language: "Schimbă limba",
    theme: "Schimbă tema",
  },
  footer: {
    platform: "Platformă",
    company: "Companie",
    resources: "Resurse",
    legal: "Juridic",
    about: "Despre",
    support: "Suport",
    firstRun: "Prima rulare",
    privacy: "Confidențialitate",
    terms: "Termeni",
    imprint: "Date legale",
    rights: "Operational Intelligence Experience",
    motto: "Alimentat de cunoștințele voastre — nu de ale noastre.",
  },
  home: {
    eyebrow: "Inteligență operațională pentru companii",
    h1a: "Sistemul de operare",
    h1b: "pentru cunoștințele operaționale —",
    serif: "pentru oameni.",
    intro:
      "OPSQAI este o platformă Windows self-hosted care aduce AI guvernat în operațiunile industriale. Suverană prin construcție: clienții își dețin datele, documentele, embeddings-urile și furnizorul de AI. Noi nu vedem niciodată cunoștințele operaționale — și am construit-o intenționat astfel, pentru că",
    introEm: "nu merge fără oameni",
  },
  product: {
    eyebrow: "Produs · O singură platformă",
    title: "Un produs pentru client.",
    serif: "Susținut de OPSQAI Cloud.",
    intro:
      "OPSQAI este un produs Windows self-hosted. Cele două suprafețe cloud — Management Center și Portalul Client — există doar pentru a susține instalarea. Angajații nu lucrează niciodată în cloud; lucrează în propria instalare.",
    guaranteeEyebrow: "Granița",
    guaranteeStrong: "Produsul este instalarea Windows.",
    guarantee:
      "OPSQAI Cloud este folosit exclusiv pentru licențiere, versiuni, distribuția installerului, suport pentru clienți, Portalul Client și Management Center.",
    surfacesEyebrow: "Produs și servicii de suport",
    surfaces: [
      {
        name: "Management Center",
        who: "Doar echipa OPSQAI",
        tag: "Cloud",
        what: "Plan de control interne. Companii, clienți, instalări, licențe, versiuni, chei de semnare, pachete de activare, contracte, suport, proprietate, administrarea portalului, audit și starea sistemului. Nu se vinde, nu se instalează și nu este accesibil clienților.",
      },
      {
        name: "Portal client",
        who: "Persoanele de contact ale clientului",
        tag: "Cloud",
        what: "Suprafață de serviciu la opsqai.de. Descarcă installerul și actualizările, preia pachetul de activare, citește documentația și notele de versiune, vezi informațiile de abonament și deschide tichete de suport. Nu este produsul — este un strat de servicii în jurul lui.",
      },
      {
        name: "Self-Hosted",
        who: "Utilizatorii finali, în fiecare zi",
        tag: "Windows · Produsul",
        what: "Instalarea Windows self-hosted este produsul și singurul loc în care lucrează angajații. Platforma Core: AI Chat, Bază de cunoștințe, SOP-uri, FAQ, Academy, AI Audit, Knowledge Gaps, Calendar, Utilizatori & roluri, Organizație, Licență & Entitlements, Actualizări. Peste ea, produsele OPSQAI licențiate deschid workspace-uri pe domenii — Operations, Calitate & Conformitate, Logistică, HR, Finanțe, Stocuri — cu furnizorul AI al clientului (Ollama pentru model complet local) pe serverul lui Windows.",
      },
    ],
    journeyEyebrow: "Livrare",
    journeyTitle: "De la achiziție la producție",
    journeyIntro:
      "Fără abonament SaaS. O licență Core plătită o singură dată, produse OPSQAI per domeniu, add-on-uri opționale și mentenanță anuală.",
    journey: [
      { title: "Achiziție", body: "Comandă platforma Core și produsele OPSQAI necesare prin OPSQAI." },
      { title: "Descarcă pachetul", body: "Preia pachetul de instalare Windows semnat din Portalul Client." },
      { title: "Rulează installerul", body: "Installerul configurează PostgreSQL, stocarea, serviciile și Caddy pe Windows Server." },
      { title: "Activează licența", body: "Introdu pachetul de licență semnat Ed25519 emis de OPSQAI. Modulele se deblochează conform licenței." },
      { title: "Configurează AI", body: "Alege furnizorul de AI — OpenAI, Azure OpenAI, Ollama, OpenRouter sau un endpoint compatibil." },
      { title: "Începe să folosești OPSQAI", body: "Invită utilizatori, încarcă SOP-uri și răspunde la întrebări operaționale cu surse citate." },
    ],
    ctaTitle: "Vrei să vezi arhitectura în funcțiune?",
    ctaBody: "Discută cu noi despre o instalare de referință a produsului Windows self-hosted.",
  },
};

export const marketingCopy: Record<string, MarketingCopy> = { en, de, ro };

export function useMarketing(): MarketingCopy {
  const { lang } = useT();
  return marketingCopy[lang] ?? en;
}

