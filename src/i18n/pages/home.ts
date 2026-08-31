// Home page copy (EN/DE) for src/routes/index.tsx.
import { useT } from "@/i18n";

const en = {
  hero: {
    eyebrow: "Enterprise Operational Intelligence",
    serifAccent: "for people.",
    h1a: "The operating system",
    h1b: "for operational knowledge —",
    intro:
      "OPSQAI is a Windows Self-Hosted platform that brings governed AI to industrial operations. Sovereign by design. Customers own their data, documents, embeddings and AI provider. We never see operational knowledge — and we built it that way on purpose, because it's",
    introEm: "not without them",
    scrollHint: "Scroll — the film begins",
    acts: ["Chaos", "Documents", "SOPs", "Network", "OPSQAI"],
  },
  cta: {
    howItWorks: "How it works",
    requestDemo: "Request demo",
  },
  whoFor: {
    eyebrow: "Who is OPSQAI for",
    title: "Built for industrial operations.",
    intro:
      "OPSQAI is designed for teams whose knowledge is operational, regulated and never allowed to leave the company boundary.",
    audiences: [
      "Warehousing",
      "Logistics",
      "Manufacturing",
      "Production",
      "Distribution",
      "Enterprise Operations",
    ],
  },
  whyNow: {
    eyebrow: "Why now",
    title: "Industrial companies can't hand knowledge to public LLMs.",
    intro:
      "Operational documents, SOPs, procedures and audits describe how a business actually runs. They require ownership, governance and complete data sovereignty — not a chat window backed by a cloud tenant nobody controls.",
    reasons: [
      { title: "Data cannot leave the company", body: "Operational knowledge is proprietary. Regulators and customers demand it stays inside the company boundary." },
      { title: "AI must be governed", body: "Every answer needs provenance: which document, which version, which user. Public chatbots cannot deliver this." },
      { title: "Infrastructure is Windows", body: "Real operations run Windows Server, Active Directory and on-prem PostgreSQL. OPSQAI meets them there." },
    ],
  },
  surfaces: {
    eyebrow: "Product architecture",
    title: "One platform. Three surfaces. One product.",
    intro:
      "OPSQAI Cloud is not the product. The Windows Self-Hosted installation is the product. The two cloud surfaces exist only to support it.",
    items: [
      {
        tag: "Cloud · OPSQAI only",
        name: "Management Center",
        body: "Internal control plane used exclusively by OPSQAI to administer customers: companies, installations, licenses, releases, signing keys, activation bundles, ownership, support and audit. Never sold. Never installed. Never accessed by customers.",
      },
      {
        tag: "Cloud · Customer contacts",
        name: "Customer Portal",
        body: "Service surface at opsqai.de for designated customer contacts. Download the installer and updates, retrieve activation bundles, read release notes and documentation, manage subscription and support. Not the product — a service layer around it.",
      },
      {
        tag: "Windows · The product",
        name: "Self-Hosted",
        body: "The Windows Self-Hosted installation is the product. AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization, Subscription, Updates and Modules — all running inside the customer's environment. Employees work here every day.",
      },
    ],
    noteStrong: "Important:",
    note:
      "OPSQAI Cloud is not the product. It exists only for licensing, releases, installer distribution, customer support, the Customer Portal and the Management Center. The product itself is the Windows installation inside the customer's environment.",
  },
  basic: {
    eyebrow: "Core Platform",
    title: "Everything you need to operate on day one.",
    intro:
      "The Core platform ships with every OPSQAI installation. It's what employees use every day.",
    items: [
      { name: "AI Chat", body: "Grounded, source-cited conversations over the customer's own knowledge." },
      { name: "Knowledge Base", body: "SOPs, manuals and procedures — chunked, embedded and retrievable locally." },
      { name: "FAQ", body: "Curated operational answers, ranked and reused across the workforce." },
      { name: "Academy", body: "Structured training paths and lessons built from the knowledge base." },
      { name: "AI Audit", body: "Every AI interaction is logged with inputs, outputs, sources and users." },
      { name: "Users", body: "Role-based access: owner, admin, manager, supervisor, worker, viewer." },
      { name: "Organization", body: "Configure AI provider, departments, branding and workspace-wide policy." },
      { name: "Subscription", body: "See the exact platform and modules licensed to this installation." },
    ],
  },
  premium: {
    eyebrow: "Premium Modules",
    title: "Grow capability without reinstalling.",
    intro:
      "OPSQAI products and optional add-ons extend the Core platform for your business domain. Each is enabled per company and delivered by OPSQAI through a signed license — no reinstall, no downtime.",
    reasons: [
      { title: "Signed license activation", body: "OPSQAI issues an Ed25519-signed license bundle. The install verifies it locally and unlocks the module." },
      { title: "No cross-module dependencies", body: "Modules are independent. Buy only what your operation needs, when it needs it." },
      { title: "Activated in place", body: "No reinstall, no migration, no data movement. Activation is silent and instant." },
    ],
    browseModules: "Browse all modules",
  },
  compare: {
    eyebrow: "Delivery model",
    title: "OPSQAI vs. cloud chatbots, DIY RAG and enterprise search.",
    intro:
      "OPSQAI is not a hosted chatbot, not a DIY stack, not another enterprise search tool. It is a self-hosted operational AI platform.",
    colHeaders: ["OPSQAI", "Cloud chatbot", "DIY RAG", "Enterprise search"],
    rows: [
      { label: "Deployment", opsqai: "Windows Self-Hosted", chatbot: "Public SaaS", diy: "DIY on-prem stack", search: "Enterprise SaaS" },
      { label: "Data ownership", opsqai: "Customer", chatbot: "Vendor tenant", diy: "Customer", search: "Vendor tenant" },
      { label: "AI provider", opsqai: "Customer's choice", chatbot: "Vendor-locked", diy: "Customer's choice", search: "Vendor-locked" },
      { label: "Auditability", opsqai: "Hash-chained audit", chatbot: "Vendor-defined", diy: "Build it yourself", search: "Partial" },
      { label: "Governance", opsqai: "Role-based, chunk-level", chatbot: "Basic", diy: "DIY", search: "Document-level" },
      { label: "Grounded answers", opsqai: "Always cited", chatbot: "Often hallucinates", diy: "Depends on build", search: "Keyword-limited" },
      { label: "Time to value", opsqai: "Weeks", chatbot: "Days", diy: "Quarters", search: "Quarters" },
    ],
  },
  diff: {
    eyebrow: "Differentiation",
    title: "Twelve reasons operations teams choose OPSQAI.",
    items: [
      { title: "Self-Hosted", body: "Runs entirely inside your Windows environment." },
      { title: "Windows Native", body: "Windows Server, WinSW services, Caddy — no Docker, no Linux." },
      { title: "Offline Capable", body: "Daily operation is fully local. Cloud only for licensing and updates." },
      { title: "Governed AI", body: "Every answer is grounded and cited from local knowledge." },
      { title: "Audit Trail", body: "Hash-chained, append-only audit of every privileged and AI action." },
      { title: "Entitlement Licensing", body: "Signed products and add-ons activated without reinstall." },
      { title: "Source Citations", body: "Answers point back to the exact document and section." },
      { title: "Role-Based Access", body: "Chunk-level ACLs; owners, admins, managers, workers, viewers." },
      { title: "Local Embeddings", body: "pgvector inside your PostgreSQL. Vectors never leave." },
      { title: "Customer Owns Data", body: "Documents, embeddings, chats, users — all customer-owned." },
      { title: "Choice of AI Model", body: "OpenAI, Azure OpenAI, Ollama, OpenRouter or compatible endpoints." },
      { title: "No Vendor Lock-In", body: "Signed artifacts, portable data, documented DR. You can leave." },
    ],
  },
  landExpand: {
    eyebrow: "Land & Expand",
    title: "A five-step customer journey.",
    intro: "OPSQAI is designed to start focused and grow with the operation.",
    steps: [
      { title: "Land", body: "Start with the Core platform on one Windows Server. One department, one operational domain." },
      { title: "Ground", body: "Ingest SOPs, manuals and procedures. Local embeddings; customer-owned AI provider." },
      { title: "Adopt", body: "Employees use AI Chat, FAQ and Academy every day. AI Audit records every interaction." },
      { title: "Expand", body: "Enable OPSQAI products through signed licenses — no reinstall, no downtime." },
      { title: "Scale", body: "Roll out to adjacent sites and departments. Annual Maintenance keeps everything current." },
    ],
  },
  maturity: {
    eyebrow: "Production maturity",
    title: "Not a prototype. A production platform.",
    intro: "Everything below is shipping today in the Windows Self-Hosted product.",
    items: [
      "Windows Server installer with WinSW services",
      "Local PostgreSQL with pgvector",
      "Local embeddings, no cloud round-trip for content",
      "Ed25519-signed licenses, verified offline",
      "Signed activation bundles with 90-day validity",
      "Hash-chained audit trail with CRL",
      "Chunk-level ACL enforcement",
      "Configurable AI provider (OpenAI, Azure, Ollama, compatible)",
      "Signed release manifests and updates",
      "Documented disaster recovery with bootstrap tokens",
      "Role-based access control across the workspace",
      "Bilingual UI (EN/DE) and PWA support",
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Answers to what matters.",
    items: [
      {
        q: "Is OPSQAI a SaaS product?",
        a: "No. OPSQAI is a Windows Self-Hosted product. Employees never work inside the cloud — they work inside the installation running on the customer's own Windows Server. OPSQAI Cloud only exists for licensing, releases, installer distribution, customer support, the Customer Portal and the Management Center.",
      },
      {
        q: "Does OPSQAI see our operational knowledge?",
        a: "No. Documents, embeddings, chat content and users all live inside the customer install. OPSQAI never stores operational customer knowledge. Only license and installation metadata reaches OPSQAI Cloud.",
      },
      {
        q: "Which AI providers are supported?",
        a: "OpenAI, Azure OpenAI, Ollama, OpenRouter, and any custom OpenAI-compatible endpoint. The customer owns the AI provider and its keys. OPSQAI has no default provider.",
      },
      {
        q: "How do we get new modules?",
        a: "Premium modules are purchased separately and activated by OPSQAI through a signed license bundle. Activation is silent — no reinstall, no data movement.",
      },
      {
        q: "What happens if we go offline?",
        a: "Daily operation continues. The installation only needs to reach OPSQAI Cloud for license activation, update checks and support. Everything else — chat, retrieval, audit — is fully local.",
      },
      {
        q: "Do you run on Docker or Linux?",
        a: "No. OPSQAI is a Windows Self-Hosted product. It runs directly on Windows Server, managed by WinSW, with a local PostgreSQL and Caddy. There is no Docker, Kubernetes or Linux requirement.",
      },
    ],
  },
  finalCta: {
    title: "Bring AI to work for your operation.",
    body:
      "Talk to OPSQAI about a reference install of the Windows Self-Hosted product. See exactly how governed operational AI runs inside your environment.",
    requestDemo: "Request demo",
    seeHowItWorks: "See how it works",
    aboutOpsqai: "About OPSQAI",
  },
  mottoBand: {
    lineOne: "For People.",
    lineTwo: "Not Without Them.",
    ariaLabel: "For people. Not without them.",
  },
};

export type HomeCopy = typeof en;

const de: HomeCopy = {
  hero: {
    eyebrow: "Operative Intelligenz für Unternehmen",
    serifAccent: "für Menschen.",
    h1a: "Das Betriebssystem",
    h1b: "für operatives Wissen —",
    intro:
      "OPSQAI ist eine Windows-Self-Hosted-Plattform, die governance-fähige KI in industrielle Abläufe bringt. Souverän von Grund auf: Kunden besitzen ihre Daten, Dokumente, Embeddings und ihren KI-Anbieter. Wir sehen operatives Wissen nie — und das ist bewusst so gebaut, denn es geht",
    introEm: "nicht ohne die Menschen",
    scrollHint: "Scrollen — der Film beginnt",
    acts: ["Chaos", "Dokumente", "SOPs", "Netzwerk", "OPSQAI"],
  },
  cta: {
    howItWorks: "So funktioniert es",
    requestDemo: "Demo anfragen",
  },
  whoFor: {
    eyebrow: "Für wen ist OPSQAI",
    title: "Gebaut für industrielle Abläufe.",
    intro:
      "OPSQAI ist für Teams konzipiert, deren Wissen operativ, reguliert und niemals dazu bestimmt ist, die Unternehmensgrenze zu verlassen.",
    audiences: [
      "Lagerhaltung",
      "Logistik",
      "Fertigung",
      "Produktion",
      "Distribution",
      "Unternehmensabläufe",
    ],
  },
  whyNow: {
    eyebrow: "Warum jetzt",
    title: "Industrieunternehmen können Wissen nicht an öffentliche LLMs übergeben.",
    intro:
      "Operative Dokumente, SOPs, Verfahren und Audits beschreiben, wie ein Unternehmen tatsächlich arbeitet. Sie erfordern Eigentümerschaft, Governance und vollständige Datensouveränität — kein Chatfenster hinter einem Cloud-Tenant, den niemand kontrolliert.",
    reasons: [
      { title: "Daten dürfen das Unternehmen nicht verlassen", body: "Operatives Wissen ist geistiges Eigentum. Regulierer und Kunden verlangen, dass es innerhalb der Unternehmensgrenze bleibt." },
      { title: "KI muss governance-fähig sein", body: "Jede Antwort braucht Herkunftsnachweis: welches Dokument, welche Version, welcher Nutzer. Öffentliche Chatbots können das nicht leisten." },
      { title: "Die Infrastruktur ist Windows", body: "Reale Betriebe laufen auf Windows Server, Active Directory und On-Premise-PostgreSQL. OPSQAI trifft sie genau dort." },
    ],
  },
  surfaces: {
    eyebrow: "Produktarchitektur",
    title: "Eine Plattform. Drei Oberflächen. Ein Produkt.",
    intro:
      "Die OPSQAI Cloud ist nicht das Produkt. Die Windows-Self-Hosted-Installation ist das Produkt. Die beiden Cloud-Oberflächen dienen nur zu deren Unterstützung.",
    items: [
      {
        tag: "Cloud · Nur OPSQAI",
        name: "Management Center",
        body: "Interne Steuerungsebene, die ausschließlich von OPSQAI zur Verwaltung von Kunden genutzt wird: Firmen, Installationen, Lizenzen, Releases, Signaturschlüssel, Aktivierungspakete, Eigentümerschaft, Support und Audit. Wird nie verkauft, nie installiert, für Kunden nicht zugänglich.",
      },
      {
        tag: "Cloud · Kundenkontakte",
        name: "Kundenportal",
        body: "Service-Oberfläche unter opsqai.de für benannte Kundenkontakte. Installer und Updates herunterladen, Aktivierungspakete abrufen, Release Notes und Dokumentation lesen, Abonnement und Support verwalten. Kein Produkt — eine Serviceschicht darum.",
      },
      {
        tag: "Windows · Das Produkt",
        name: "Self-Hosted",
        body: "Die Windows-Self-Hosted-Installation ist das Produkt. KI-Chat, Wissensdatenbank, FAQ, Academy, KI-Audit, Benutzer, Organisation, Abonnement, Updates und Module — alles läuft innerhalb der Umgebung des Kunden. Mitarbeitende arbeiten hier jeden Tag.",
      },
    ],
    noteStrong: "Wichtig:",
    note:
      "Die OPSQAI Cloud ist nicht das Produkt. Sie existiert nur für Lizenzierung, Releases, Installer-Verteilung, Kundensupport, das Kundenportal und das Management Center. Das Produkt selbst ist die Windows-Installation innerhalb der Umgebung des Kunden.",
  },
  basic: {
    eyebrow: "Core-Plattform",
    title: "Alles, was Sie ab dem ersten Tag brauchen.",
    intro:
      "Die Core-Plattform ist Bestandteil jeder OPSQAI-Installation. Sie wird von Mitarbeitenden täglich genutzt.",
    items: [
      { name: "KI-Chat", body: "Belegte, quellengestützte Gespräche über das eigene Wissen des Kunden." },
      { name: "Wissensdatenbank", body: "SOPs, Handbücher und Verfahren — lokal aufgeteilt, eingebettet und abrufbar." },
      { name: "FAQ", body: "Kuratierte operative Antworten, bewertet und unternehmensweit wiederverwendet." },
      { name: "Academy", body: "Strukturierte Lernpfade und Lektionen, aufgebaut aus der Wissensdatenbank." },
      { name: "KI-Audit", body: "Jede KI-Interaktion wird mit Eingaben, Ausgaben, Quellen und Nutzern protokolliert." },
      { name: "Benutzer", body: "Rollenbasierter Zugriff: Owner, Admin, Manager, Supervisor, Worker, Viewer." },
      { name: "Organisation", body: "KI-Anbieter, Abteilungen, Branding und unternehmensweite Richtlinien konfigurieren." },
      { name: "Abonnement", body: "Genau sehen, welche Plattform und Module für diese Installation lizenziert sind." },
    ],
  },
  premium: {
    eyebrow: "Produkte & Add-ons",
    title: "Funktionsumfang erweitern, ohne neu zu installieren.",
    intro:
      "OPSQAI-Produkte und optionale Add-ons erweitern die Core-Plattform um Ihren Fachbereich. Sie werden pro Unternehmen aktiviert und von OPSQAI über eine signierte Lizenz ausgeliefert — ohne Neuinstallation, ohne Ausfallzeit.",
    reasons: [
      { title: "Signierte Lizenzaktivierung", body: "OPSQAI stellt ein Ed25519-signiertes Lizenzpaket aus. Die Installation prüft es lokal und schaltet das Modul frei." },
      { title: "Keine modulübergreifenden Abhängigkeiten", body: "Module sind unabhängig. Kaufen Sie nur, was Ihr Betrieb braucht, wann er es braucht." },
      { title: "Aktivierung ohne Unterbrechung", body: "Keine Neuinstallation, keine Migration, keine Datenbewegung. Aktivierung erfolgt still und sofort." },
    ],
    browseModules: "Alle Module ansehen",
  },
  compare: {
    eyebrow: "Bereitstellungsmodell",
    title: "OPSQAI im Vergleich zu Cloud-Chatbots, DIY-RAG und Enterprise Search.",
    intro:
      "OPSQAI ist kein gehosteter Chatbot, kein DIY-Stack und kein weiteres Enterprise-Search-Tool. Es ist eine self-hosted operative KI-Plattform.",
    colHeaders: ["OPSQAI", "Cloud-Chatbot", "DIY-RAG", "Enterprise Search"],
    rows: [
      { label: "Bereitstellung", opsqai: "Windows Self-Hosted", chatbot: "Öffentliches SaaS", diy: "DIY On-Premise-Stack", search: "Enterprise-SaaS" },
      { label: "Dateneigentum", opsqai: "Kunde", chatbot: "Anbieter-Tenant", diy: "Kunde", search: "Anbieter-Tenant" },
      { label: "KI-Anbieter", opsqai: "Wahl des Kunden", chatbot: "Anbietergebunden", diy: "Wahl des Kunden", search: "Anbietergebunden" },
      { label: "Prüfbarkeit", opsqai: "Hash-verketteter Audit", chatbot: "Anbieterdefiniert", diy: "Selbst aufzubauen", search: "Teilweise" },
      { label: "Governance", opsqai: "Rollenbasiert, auf Chunk-Ebene", chatbot: "Grundlegend", diy: "DIY", search: "Auf Dokumentebene" },
      { label: "Belegte Antworten", opsqai: "Immer mit Quellenangabe", chatbot: "Halluziniert häufig", diy: "Abhängig vom Aufbau", search: "Nur stichwortbasiert" },
      { label: "Time to Value", opsqai: "Wochen", chatbot: "Tage", diy: "Quartale", search: "Quartale" },
    ],
  },
  diff: {
    eyebrow: "Unterscheidungsmerkmale",
    title: "Zwölf Gründe, warum Betriebsteams sich für OPSQAI entscheiden.",
    items: [
      { title: "Self-Hosted", body: "Läuft vollständig innerhalb Ihrer Windows-Umgebung." },
      { title: "Windows-nativ", body: "Windows Server, WinSW-Dienste, Caddy — kein Docker, kein Linux." },
      { title: "Offlinefähig", body: "Der tägliche Betrieb ist vollständig lokal. Cloud nur für Lizenzierung und Updates." },
      { title: "Governance-fähige KI", body: "Jede Antwort ist belegt und aus lokalem Wissen zitiert." },
      { title: "Audit-Trail", body: "Hash-verketteter, unveränderlicher Audit jeder privilegierten und KI-Aktion." },
      { title: "Berechtigungs-Lizenzierung", body: "Signierte Produkte und Add-ons ohne Neuinstallation aktiviert." },
      { title: "Quellenangaben", body: "Antworten verweisen auf das genaue Dokument und den Abschnitt." },
      { title: "Rollenbasierter Zugriff", body: "ACLs auf Chunk-Ebene; Owner, Admins, Manager, Worker, Viewer." },
      { title: "Lokale Embeddings", body: "pgvector innerhalb Ihres PostgreSQL. Vektoren verlassen das Haus nie." },
      { title: "Kunde besitzt die Daten", body: "Dokumente, Embeddings, Chats, Nutzer — alles im Besitz des Kunden." },
      { title: "Wahl des KI-Modells", body: "OpenAI, Azure OpenAI, Ollama, OpenRouter oder kompatible Endpunkte." },
      { title: "Keine Anbieterbindung", body: "Signierte Artefakte, portable Daten, dokumentiertes Disaster Recovery. Sie können jederzeit wechseln." },
    ],
  },
  landExpand: {
    eyebrow: "Land & Expand",
    title: "Eine fünfstufige Kundenreise.",
    intro: "OPSQAI ist darauf ausgelegt, fokussiert zu starten und mit dem Betrieb zu wachsen.",
    steps: [
      { title: "Landen", body: "Start mit der Core-Plattform auf einem Windows Server. Eine Abteilung, eine operative Domäne." },
      { title: "Grundlage schaffen", body: "SOPs, Handbücher und Verfahren einlesen. Lokale Embeddings; kundeneigener KI-Anbieter." },
      { title: "Annehmen", body: "Mitarbeitende nutzen täglich KI-Chat, FAQ und Academy. KI-Audit erfasst jede Interaktion." },
      { title: "Erweitern", body: "OPSQAI-Produkte über signierte Lizenzen aktivieren — ohne Neuinstallation, ohne Ausfallzeit." },
      { title: "Skalieren", body: "Rollout auf angrenzende Standorte und Abteilungen. Jährliche Wartung hält alles aktuell." },
    ],
  },
  maturity: {
    eyebrow: "Produktionsreife",
    title: "Kein Prototyp. Eine Produktionsplattform.",
    intro: "Alles unten ist heute produktiv im Windows-Self-Hosted-Produkt im Einsatz.",
    items: [
      "Windows-Server-Installer mit WinSW-Diensten",
      "Lokales PostgreSQL mit pgvector",
      "Lokale Embeddings, kein Cloud-Roundtrip für Inhalte",
      "Ed25519-signierte Lizenzen, offline verifiziert",
      "Signierte Aktivierungspakete mit 90 Tagen Gültigkeit",
      "Hash-verketteter Audit-Trail mit CRL",
      "Durchsetzung von ACLs auf Chunk-Ebene",
      "Konfigurierbarer KI-Anbieter (OpenAI, Azure, Ollama, kompatibel)",
      "Signierte Release-Manifeste und Updates",
      "Dokumentiertes Disaster Recovery mit Bootstrap-Tokens",
      "Rollenbasierte Zugriffskontrolle im gesamten Workspace",
      "Zweisprachige Oberfläche (DE/EN) und PWA-Unterstützung",
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Antworten auf das Wesentliche.",
    items: [
      {
        q: "Ist OPSQAI ein SaaS-Produkt?",
        a: "Nein. OPSQAI ist ein Windows-Self-Hosted-Produkt. Mitarbeitende arbeiten niemals in der Cloud — sie arbeiten in der Installation auf dem eigenen Windows Server des Kunden. Die OPSQAI Cloud existiert nur für Lizenzierung, Releases, Installer-Verteilung, Kundensupport, das Kundenportal und das Management Center.",
      },
      {
        q: "Sieht OPSQAI unser operatives Wissen?",
        a: "Nein. Dokumente, Embeddings, Chatinhalte und Nutzer liegen ausschließlich innerhalb der Kundeninstallation. OPSQAI speichert niemals operatives Kundenwissen. Nur Lizenz- und Installationsmetadaten erreichen die OPSQAI Cloud.",
      },
      {
        q: "Welche KI-Anbieter werden unterstützt?",
        a: "OpenAI, Azure OpenAI, Ollama, OpenRouter und jeder benutzerdefinierte OpenAI-kompatible Endpunkt. Der Kunde besitzt den KI-Anbieter und dessen Schlüssel. OPSQAI hat keinen Standardanbieter.",
      },
      {
        q: "Wie erhalten wir neue Module?",
        a: "OPSQAI-Produkte und Add-ons werden pro Unternehmen aktiviert und von OPSQAI über ein signiertes Lizenzpaket ausgeliefert. Die Aktivierung erfolgt still — ohne Neuinstallation, ohne Datenbewegung.",
      },
      {
        q: "Was passiert, wenn wir offline gehen?",
        a: "Der tägliche Betrieb läuft weiter. Die Installation muss die OPSQAI Cloud nur für Lizenzaktivierung, Update-Prüfungen und Support erreichen. Alles andere — Chat, Retrieval, Audit — ist vollständig lokal.",
      },
      {
        q: "Läuft das auf Docker oder Linux?",
        a: "Nein. OPSQAI ist ein Windows-Self-Hosted-Produkt. Es läuft direkt auf Windows Server, verwaltet von WinSW, mit lokalem PostgreSQL und Caddy. Es gibt keine Anforderung an Docker, Kubernetes oder Linux.",
      },
    ],
  },
  finalCta: {
    title: "Bringen Sie KI in Ihren Betrieb.",
    body:
      "Sprechen Sie mit OPSQAI über eine Referenzinstallation des Windows-Self-Hosted-Produkts. Sehen Sie genau, wie governance-fähige operative KI innerhalb Ihrer Umgebung läuft.",
    requestDemo: "Demo anfragen",
    seeHowItWorks: "So funktioniert es",
    aboutOpsqai: "Über OPSQAI",
  },
  mottoBand: {
    lineOne: "Für Menschen.",
    lineTwo: "Nicht ohne sie.",
    ariaLabel: "Für Menschen. Nicht ohne sie.",
  },
};

const ro: HomeCopy = {
  hero: {
    eyebrow: "Inteligență operațională pentru companii",
    serifAccent: "pentru oameni.",
    h1a: "Sistemul de operare",
    h1b: "pentru cunoștințe operaționale —",
    intro:
      "OPSQAI este o platformă Windows Self-Hosted care aduce AI guvernat în operațiunile industriale. Suverană prin design. Clienții dețin datele, documentele, embeddings-urile și furnizorul de AI. Noi nu vedem niciodată cunoștințele operaționale — și am construit-o intenționat așa, pentru că",
    introEm: "nu se poate fără ei",
    scrollHint: "Derulați — filmul începe",
    acts: ["Haos", "Documente", "SOP-uri", "Rețea", "OPSQAI"],
  },
  cta: {
    howItWorks: "Cum funcționează",
    requestDemo: "Solicită demo",
  },
  whoFor: {
    eyebrow: "Pentru cine este OPSQAI",
    title: "Construit pentru operațiuni industriale.",
    intro:
      "OPSQAI este conceput pentru echipe ale căror cunoștințe sunt operaționale, reglementate și nu au voie să părăsească niciodată granița companiei.",
    audiences: [
      "Depozitare",
      "Logistică",
      "Producție",
      "Fabricație",
      "Distribuție",
      "Operațiuni la nivel de companie",
    ],
  },
  whyNow: {
    eyebrow: "De ce acum",
    title: "Companiile industriale nu pot preda cunoștințele către LLM-uri publice.",
    intro:
      "Documentele operaționale, SOP-urile, procedurile și auditurile descriu modul real de funcționare a unei afaceri. Ele necesită proprietate, guvernanță și suveranitate completă a datelor — nu o fereastră de chat susținută de un tenant cloud pe care nimeni nu îl controlează.",
    reasons: [
      { title: "Datele nu pot părăsi compania", body: "Cunoștințele operaționale sunt proprietate exclusivă. Autoritățile de reglementare și clienții cer ca acestea să rămână în interiorul granițelor companiei." },
      { title: "AI trebuie să fie guvernat", body: "Fiecare răspuns are nevoie de trasabilitate: ce document, ce versiune, ce utilizator. Chatboturile publice nu pot oferi acest lucru." },
      { title: "Infrastructura este Windows", body: "Operațiunile reale rulează pe Windows Server, Active Directory și PostgreSQL on-premise. OPSQAI vine exact acolo unde sunt clienții." },
    ],
  },
  surfaces: {
    eyebrow: "Arhitectura produsului",
    title: "O platformă. Trei interfețe. Un singur produs.",
    intro:
      "OPSQAI Cloud nu este produsul. Instalarea Windows Self-Hosted este produsul. Cele două interfețe cloud există doar pentru a-l susține.",
    items: [
      {
        tag: "Cloud · Doar OPSQAI",
        name: "Management Center",
        body: "Plan de control intern, folosit exclusiv de OPSQAI pentru administrarea clienților: companii, instalări, licențe, versiuni, chei de semnare, pachete de activare, proprietate, suport și audit. Nu se vinde niciodată, nu se instalează niciodată, nu este accesibil clienților.",
      },
      {
        tag: "Cloud · Contacte client",
        name: "Portal Client",
        body: "Interfață de servicii la opsqai.de pentru contactele desemnate ale clienților. Descarcă instalatorul și actualizările, preia pachetele de activare, citește note de lansare și documentație, gestionează abonamentul și suportul. Nu este produsul — este un strat de servicii în jurul lui.",
      },
      {
        tag: "Windows · Produsul",
        name: "Self-Hosted",
        body: "Instalarea Windows Self-Hosted este produsul. AI Chat, Bază de Cunoștințe, FAQ, Academy, Audit AI, Utilizatori, Organizație, Abonament, Actualizări și Module — toate rulează în interiorul mediului clientului. Angajații lucrează aici în fiecare zi.",
      },
    ],
    noteStrong: "Important:",
    note:
      "OPSQAI Cloud nu este produsul. Există doar pentru licențiere, versiuni, distribuirea instalatorului, suport pentru clienți, Portalul Client și Management Center. Produsul propriu-zis este instalarea Windows din interiorul mediului clientului.",
  },
  basic: {
    eyebrow: "Platforma de Bază",
    title: "Tot ce ai nevoie pentru a opera din prima zi.",
    intro:
      "Platforma de Bază este inclusă în fiecare instalare OPSQAI. Este ceea ce angajații folosesc zilnic.",
    items: [
      { name: "AI Chat", body: "Conversații fundamentate, cu citarea surselor, bazate pe propriile cunoștințe ale clientului." },
      { name: "Bază de Cunoștințe", body: "SOP-uri, manuale și proceduri — segmentate, transformate în embeddings și recuperabile local." },
      { name: "FAQ", body: "Răspunsuri operaționale curate, clasificate și reutilizate în cadrul forței de muncă." },
      { name: "Academy", body: "Trasee de instruire structurate și lecții construite din baza de cunoștințe." },
      { name: "Audit AI", body: "Fiecare interacțiune AI este înregistrată cu intrări, ieșiri, surse și utilizatori." },
      { name: "Utilizatori", body: "Acces bazat pe roluri: owner, admin, manager, supervizor, lucrător, vizualizator." },
      { name: "Organizație", body: "Configurează furnizorul de AI, departamentele, brandingul și politica la nivel de workspace." },
      { name: "Abonament", body: "Vezi exact ce platformă și module sunt licențiate pentru această instalare." },
    ],
  },
  premium: {
    eyebrow: "Module Premium",
    title: "Extinde capabilitățile fără reinstalare.",
    intro:
      "Modulele premium deblochează capabilități mai avansate peste Platforma de Bază. Fiecare este licențiat separat și activat de OPSQAI printr-o licență semnată — fără reinstalare, fără timp de nefuncționare.",
    reasons: [
      { title: "Activare prin licență semnată", body: "OPSQAI emite un pachet de licență semnat Ed25519. Instalarea îl verifică local și deblochează modulul." },
      { title: "Fără dependențe între module", body: "Modulele sunt independente. Cumperi doar ce are nevoie operațiunea ta, atunci când are nevoie." },
      { title: "Activare pe loc", body: "Fără reinstalare, fără migrare, fără mutare de date. Activarea este silențioasă și instantanee." },
    ],
    browseModules: "Vezi toate modulele",
  },
  compare: {
    eyebrow: "Model de livrare",
    title: "OPSQAI vs. chatboturi cloud, RAG artizanal și enterprise search.",
    intro:
      "OPSQAI nu este un chatbot găzduit, nu este un stack construit intern, nu este un alt instrument de enterprise search. Este o platformă de AI operațional self-hosted.",
    colHeaders: ["OPSQAI", "Chatbot cloud", "RAG artizanal", "Enterprise search"],
    rows: [
      { label: "Implementare", opsqai: "Windows Self-Hosted", chatbot: "SaaS public", diy: "Stack on-premise artizanal", search: "SaaS enterprise" },
      { label: "Proprietatea datelor", opsqai: "Client", chatbot: "Tenant furnizor", diy: "Client", search: "Tenant furnizor" },
      { label: "Furnizor AI", opsqai: "Alegerea clientului", chatbot: "Legat de furnizor", diy: "Alegerea clientului", search: "Legat de furnizor" },
      { label: "Auditabilitate", opsqai: "Audit hash-chained", chatbot: "Definit de furnizor", diy: "Se construiește intern", search: "Parțială" },
      { label: "Guvernanță", opsqai: "Bazată pe roluri, la nivel de fragment", chatbot: "De bază", diy: "Artizanală", search: "La nivel de document" },
      { label: "Răspunsuri fundamentate", opsqai: "Întotdeauna citate", chatbot: "Adesea halucinează", diy: "Depinde de implementare", search: "Limitat la cuvinte-cheie" },
      { label: "Timp până la valoare", opsqai: "Săptămâni", chatbot: "Zile", diy: "Trimestre", search: "Trimestre" },
    ],
  },
  diff: {
    eyebrow: "Diferențiere",
    title: "Douăsprezece motive pentru care echipele operaționale aleg OPSQAI.",
    items: [
      { title: "Self-Hosted", body: "Rulează în întregime în mediul tău Windows." },
      { title: "Nativ Windows", body: "Windows Server, servicii WinSW, Caddy — fără Docker, fără Linux." },
      { title: "Capabil offline", body: "Operarea zilnică este complet locală. Cloud doar pentru licențiere și actualizări." },
      { title: "AI guvernat", body: "Fiecare răspuns este fundamentat și citat din cunoștințe locale." },
      { title: "Jurnal de audit", body: "Audit hash-chained, append-only al fiecărei acțiuni privilegiate sau AI." },
      { title: "Licențiere prin drepturi", body: "Produse și add-on-uri semnate, activate fără reinstalare." },
      { title: "Citarea surselor", body: "Răspunsurile trimit înapoi la documentul și secțiunea exactă." },
      { title: "Acces bazat pe roluri", body: "ACL-uri la nivel de fragment; owners, admini, manageri, lucrători, vizualizatori." },
      { title: "Embeddings locale", body: "pgvector în interiorul propriului PostgreSQL. Vectorii nu părăsesc niciodată mediul." },
      { title: "Clientul deține datele", body: "Documente, embeddings, conversații, utilizatori — toate deținute de client." },
      { title: "Alegerea modelului AI", body: "OpenAI, Azure OpenAI, Ollama, OpenRouter sau endpointuri compatibile." },
      { title: "Fără dependență de furnizor", body: "Artefacte semnate, date portabile, DR documentat. Poți pleca oricând." },
    ],
  },
  landExpand: {
    eyebrow: "Land & Expand",
    title: "O călătorie a clientului în cinci pași.",
    intro: "OPSQAI este conceput să înceapă concentrat și să crească odată cu operațiunea.",
    steps: [
      { title: "Land", body: "Începe cu Platforma de Bază pe un singur Windows Server. Un departament, un domeniu operațional." },
      { title: "Ground", body: "Se încarcă SOP-uri, manuale și proceduri. Embeddings locale; furnizor AI deținut de client." },
      { title: "Adopt", body: "Angajații folosesc zilnic AI Chat, FAQ și Academy. Audit AI înregistrează fiecare interacțiune." },
      { title: "Expand", body: "Activează produse OPSQAI prin licențe semnate — fără reinstalare, fără timp de nefuncționare." },
      { title: "Scale", body: "Extindere la sedii și departamente adiacente. Mentenanța anuală menține totul actualizat." },
    ],
  },
  maturity: {
    eyebrow: "Maturitate în producție",
    title: "Nu un prototip. O platformă de producție.",
    intro: "Tot ce urmează este livrat astăzi în produsul Windows Self-Hosted.",
    items: [
      "Instalator Windows Server cu servicii WinSW",
      "PostgreSQL local cu pgvector",
      "Embeddings locale, fără roundtrip în cloud pentru conținut",
      "Licențe semnate Ed25519, verificate offline",
      "Pachete de activare semnate, cu valabilitate de 90 de zile",
      "Jurnal de audit hash-chained cu CRL",
      "Aplicarea ACL-urilor la nivel de fragment",
      "Furnizor AI configurabil (OpenAI, Azure, Ollama, compatibil)",
      "Manifeste de lansare și actualizări semnate",
      "Disaster recovery documentat cu token-uri bootstrap",
      "Control al accesului bazat pe roluri în tot workspace-ul",
      "Interfață bilingvă (EN/DE) și suport PWA",
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Răspunsuri la ce contează cu adevărat.",
    items: [
      {
        q: "OPSQAI este un produs SaaS?",
        a: "Nu. OPSQAI este un produs Windows Self-Hosted. Angajații nu lucrează niciodată în cloud — ei lucrează în instalarea care rulează pe propriul Windows Server al clientului. OPSQAI Cloud există doar pentru licențiere, versiuni, distribuirea instalatorului, suport pentru clienți, Portalul Client și Management Center.",
      },
      {
        q: "OPSQAI vede cunoștințele noastre operaționale?",
        a: "Nu. Documentele, embeddings-urile, conținutul conversațiilor și utilizatorii se află exclusiv în instalarea clientului. OPSQAI nu stochează niciodată cunoștințe operaționale ale clientului. Doar metadatele de licență și instalare ajung la OPSQAI Cloud.",
      },
      {
        q: "Ce furnizori de AI sunt acceptați?",
        a: "OpenAI, Azure OpenAI, Ollama, OpenRouter și orice endpoint personalizat compatibil OpenAI. Clientul deține furnizorul de AI și cheile acestuia. OPSQAI nu are un furnizor implicit.",
      },
      {
        q: "Cum obținem module noi?",
        a: "Modulele premium se achiziționează separat și sunt activate de OPSQAI printr-un pachet de licență semnat. Activarea este silențioasă — fără reinstalare, fără mutare de date.",
      },
      {
        q: "Ce se întâmplă dacă rămânem offline?",
        a: "Operarea zilnică continuă. Instalarea trebuie să contacteze OPSQAI Cloud doar pentru activarea licenței, verificarea actualizărilor și suport. Tot restul — chat, recuperare, audit — este complet local.",
      },
      {
        q: "Rulați pe Docker sau Linux?",
        a: "Nu. OPSQAI este un produs Windows Self-Hosted. Rulează direct pe Windows Server, gestionat de WinSW, cu PostgreSQL local și Caddy. Nu există nicio cerință pentru Docker, Kubernetes sau Linux.",
      },
    ],
  },
  finalCta: {
    title: "Adu AI la lucru pentru operațiunea ta.",
    body:
      "Discută cu OPSQAI despre o instalare de referință a produsului Windows Self-Hosted. Vezi exact cum rulează AI-ul operațional guvernat în mediul tău.",
    requestDemo: "Solicită demo",
    seeHowItWorks: "Vezi cum funcționează",
    aboutOpsqai: "Despre OPSQAI",
  },
  mottoBand: {
    lineOne: "Pentru oameni.",
    lineTwo: "Nu fără ei.",
    ariaLabel: "Pentru oameni. Nu fără ei.",
  },
};

export function useHomeCopy(): HomeCopy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
