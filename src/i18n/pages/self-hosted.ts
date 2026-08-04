import { useT } from "@/i18n";

const en = {
  heroEyebrow: "Self-Hosted · The Product",
  heroSerifAccent: "stays yours.",
  heroHeadline: "Your data",
  heroBody:
    "OPSQAI is installed on the customer's Windows Server. Data, documents, embeddings, users and AI provider all live inside the customer's environment. OPSQAI Cloud is used only when the installation needs it — for license activation, update checks and support. Nothing operational ever crosses the boundary.",
  ctaRequestInstallation: "Request installation package",
  ctaReadDocumentation: "Read documentation",

  dataFlowEyebrow: "Data flow",
  dataFlowSerifAccent: "the boundary.",
  dataFlowHeadline: "Everything flows inside",
  dataFlowBody:
    "The diagram below is the entire operational path. Only license heartbeat and update checks cross the boundary — and they carry no operational content.",

  flow: [
    { label: "Windows Server", body: "Customer-owned host, inside the customer's network." },
    { label: "OPSQAI Platform", body: "Windows services managed by WinSW. The product itself." },
    { label: "Local PostgreSQL", body: "Relational store. Users, chats, documents, audit — all local." },
    { label: "pgvector", body: "Vector index inside PostgreSQL. Embeddings never leave." },
    { label: "Local storage", body: "Documents on the customer's filesystem or object storage." },
    { label: "Customer's AI provider", body: "OpenAI, Azure OpenAI, Ollama or compatible endpoint." },
  ],

  crossesBoundaryTitle: "What crosses the boundary",
  crossesBoundaryItems: [
    "Signed license activation",
    "Update manifest checks",
    "Support (opt-in, initiated by the customer)",
  ],
  neverLeavesTitle: "What never leaves",
  neverLeavesItems: [
    "Documents, SOPs, procedures",
    "Embeddings and vector index",
    "Chat messages and AI audit records",
    "Users, roles and organization configuration",
  ],

  pillarsEyebrow: "Six pillars",
  pillarsSerifAccent: "by construction.",
  pillarsHeadline: "Sovereign",
  pillars: [
    { title: "Runs on Windows Server", body: "Windows Server 2019/2022. Installer provisions PostgreSQL, storage, services and Caddy. WinSW manages every service. No Docker, no Kubernetes, no Linux." },
    { title: "Local PostgreSQL + pgvector", body: "The database and vector store live inside the customer's Windows environment. Documents, chunks and embeddings never leave." },
    { title: "Customer-owned AI provider", body: "OpenAI, Azure OpenAI, Ollama, OpenRouter or any OpenAI-compatible endpoint. The customer owns the account and the keys." },
    { title: "Signed everything", body: "Signed Windows installer, signed release manifests, signed license bundles. Every artifact is cryptographically verifiable." },
    { title: "Single tenant by design", body: "Every install is one customer, one workspace, one boundary. Nothing is shared across customers — not databases, not embeddings, not AI keys." },
    { title: "Disaster recovery built in", body: "DR bootstrap tokens, signed backups and documented restore. The customer's ops team can rebuild the installation without OPSQAI in the loop." },
  ],

  requirementsEyebrow: "System requirements",
  requirementsSerifAccent: "ready.",
  requirementsHeadline: "Enterprise",
  requirements: [
    "Windows Server 2019 or 2022 (Standard or Datacenter)",
    "8 vCPU · 16 GB RAM · 200 GB SSD minimum",
    "Outbound HTTPS to the customer's chosen AI provider (or none, with local models)",
    "TLS certificate for the internal domain (Caddy can also issue via ACME)",
    "Domain administrator to run the installer (elevated)",
  ],

  finalEyebrow: "Get the signed installer",
  finalSerifAccent: "starts here.",
  finalHeadline: "The install",
  finalBody:
    "Existing customers download from the Customer Portal. New customers, contact us for a licensed evaluation.",
  ctaContactSales: "Contact sales",
  ctaSecurityOverview: "Security overview",
};

type Copy = typeof en;

const de: Copy = {
  heroEyebrow: "Self-Hosted · Das Produkt",
  heroSerifAccent: "bleiben Ihre.",
  heroHeadline: "Ihre Daten",
  heroBody:
    "OPSQAI wird auf dem Windows Server des Kunden installiert. Daten, Dokumente, Embeddings, Benutzer und der KI-Anbieter befinden sich vollständig in der Umgebung des Kunden. Die OPSQAI Cloud wird nur genutzt, wenn die Installation sie benötigt — für Lizenzaktivierung, Update-Prüfungen und Support. Nichts Operatives überschreitet jemals die Grenze.",
  ctaRequestInstallation: "Installationspaket anfragen",
  ctaReadDocumentation: "Dokumentation lesen",

  dataFlowEyebrow: "Datenfluss",
  dataFlowSerifAccent: "die Grenze.",
  dataFlowHeadline: "Alles fließt innerhalb",
  dataFlowBody:
    "Das folgende Diagramm zeigt den gesamten operativen Pfad. Nur Lizenz-Heartbeats und Update-Prüfungen überschreiten die Grenze — und diese enthalten keine operativen Inhalte.",

  flow: [
    { label: "Windows Server", body: "Vom Kunden betriebener Host, innerhalb des Kundennetzwerks." },
    { label: "OPSQAI-Plattform", body: "Windows-Dienste, verwaltet von WinSW. Das Produkt selbst." },
    { label: "Lokales PostgreSQL", body: "Relationale Datenbank. Benutzer, Chats, Dokumente, Audit — alles lokal." },
    { label: "pgvector", body: "Vektorindex innerhalb von PostgreSQL. Embeddings verlassen die Umgebung nie." },
    { label: "Lokaler Speicher", body: "Dokumente auf dem Dateisystem oder Objektspeicher des Kunden." },
    { label: "KI-Anbieter des Kunden", body: "OpenAI, Azure OpenAI, Ollama oder ein kompatibler Endpunkt." },
  ],

  crossesBoundaryTitle: "Was die Grenze überschreitet",
  crossesBoundaryItems: [
    "Signierte Lizenzaktivierung",
    "Update-Manifest-Prüfungen",
    "Support (opt-in, vom Kunden initiiert)",
  ],
  neverLeavesTitle: "Was niemals die Umgebung verlässt",
  neverLeavesItems: [
    "Dokumente, SOPs, Verfahrensanweisungen",
    "Embeddings und Vektorindex",
    "Chat-Nachrichten und KI-Audit-Datensätze",
    "Benutzer, Rollen und Organisationskonfiguration",
  ],

  pillarsEyebrow: "Sechs Säulen",
  pillarsSerifAccent: "von Grund auf.",
  pillarsHeadline: "Souverän",
  pillars: [
    { title: "Läuft auf Windows Server", body: "Windows Server 2019/2022. Der Installer richtet PostgreSQL, Speicher, Dienste und Caddy ein. WinSW verwaltet jeden Dienst. Kein Docker, kein Kubernetes, kein Linux." },
    { title: "Lokales PostgreSQL + pgvector", body: "Datenbank und Vektorspeicher befinden sich innerhalb der Windows-Umgebung des Kunden. Dokumente, Chunks und Embeddings verlassen sie nie." },
    { title: "Kundeneigener KI-Anbieter", body: "OpenAI, Azure OpenAI, Ollama, OpenRouter oder jeder OpenAI-kompatible Endpunkt. Der Kunde besitzt das Konto und die Schlüssel." },
    { title: "Alles signiert", body: "Signierter Windows-Installer, signierte Release-Manifeste, signierte Lizenzpakete. Jedes Artefakt ist kryptografisch verifizierbar." },
    { title: "Single Tenant von Design her", body: "Jede Installation ist ein Kunde, ein Arbeitsbereich, eine Grenze. Nichts wird zwischen Kunden geteilt — weder Datenbanken, noch Embeddings, noch KI-Schlüssel." },
    { title: "Notfallwiederherstellung integriert", body: "DR-Bootstrap-Tokens, signierte Backups und dokumentierte Wiederherstellung. Das Ops-Team des Kunden kann die Installation ohne OPSQAI wiederherstellen." },
  ],

  requirementsEyebrow: "Systemanforderungen",
  requirementsSerifAccent: "bereit.",
  requirementsHeadline: "Enterprise",
  requirements: [
    "Windows Server 2019 oder 2022 (Standard oder Datacenter)",
    "8 vCPU · 16 GB RAM · mindestens 200 GB SSD",
    "Ausgehendes HTTPS zum gewählten KI-Anbieter des Kunden (oder keines, bei lokalen Modellen)",
    "TLS-Zertifikat für die interne Domain (Caddy kann auch per ACME ausstellen)",
    "Domänenadministrator zur Ausführung des Installers (mit erhöhten Rechten)",
  ],

  finalEyebrow: "Den signierten Installer erhalten",
  finalSerifAccent: "beginnt hier.",
  finalHeadline: "Die Installation",
  finalBody:
    "Bestehende Kunden laden im Kundenportal herunter. Neue Kunden kontaktieren uns für eine lizenzierte Evaluierung.",
  ctaContactSales: "Vertrieb kontaktieren",
  ctaSecurityOverview: "Sicherheitsübersicht",
};

export function useSelfHostedCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : en;
}
