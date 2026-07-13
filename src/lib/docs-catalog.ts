// Static catalog of shipped documentation books. Rendered in-app via
// `/app/docs/*` and listed publicly on `/docs`. Content lives under
// `docs/<slug>/` in the repo; this catalog only declares metadata.
//
// Keep in sync with `docs/book.yaml`.

export interface DocChapter {
  slug: string; // file name without .md
  title: string;
}

export interface DocBook {
  slug: string;
  title: string;
  audience: string;
  summary: string;
  public: boolean;
  chapters: readonly DocChapter[];
}

export const DOC_VERSION = "1.0";
export const DOC_CUT_DATE = "2026-07-11";

export const DOC_BOOKS: readonly DocBook[] = [
  {
    slug: "product-documentation",
    title: "Product Documentation",
    audience: "Customer CTO / decision maker",
    summary: "What OPSQAI is, why it exists, how it fits into your organization.",
    public: true,
    chapters: [
      { slug: "01-what-is-opsqai", title: "What is OPSQAI" },
      { slug: "02-why-it-exists", title: "Why OPSQAI exists" },
      { slug: "03-architecture", title: "High-level architecture" },
      { slug: "04-modules", title: "Modules" },
      { slug: "05-licensing", title: "Licensing model" },
      { slug: "06-how-ai-works", title: "How the AI works" },
      { slug: "07-updates", title: "Updates" },
      { slug: "08-backup-and-dr", title: "Backup and DR" },
      { slug: "09-ownership", title: "Ownership model" },
      { slug: "10-security-overview", title: "Security overview" },
      { slug: "11-faq", title: "FAQ" },
    ],
  },
  {
    slug: "administrator-guide",
    title: "Administrator Guide",
    audience: "Customer IT administrator",
    summary: "Install, configure, run, back up, and update OPSQAI.",
    public: true,
    chapters: [
      { slug: "01-prerequisites", title: "Prerequisites" },
      { slug: "02-installation", title: "Installation" },
      { slug: "03-setup-wizard", title: "Setup Wizard" },
      { slug: "04-postgres", title: "PostgreSQL" },
      { slug: "05-object-storage", title: "Object storage" },
      { slug: "06-smtp", title: "SMTP" },
      { slug: "07-sso", title: "Single Sign-On" },
      { slug: "08-ai-provider", title: "AI provider" },
      { slug: "09-license-management", title: "License management" },
      { slug: "10-backups", title: "Backups" },
      { slug: "11-restore", title: "Restore" },
      { slug: "12-updates", title: "Updates" },
      { slug: "13-modules", title: "Modules — enable / disable" },
      { slug: "14-health-doctor", title: "Health check — opsqai doctor" },
      { slug: "15-troubleshooting", title: "Troubleshooting" },
    ],
  },
  {
    slug: "technical-documentation",
    title: "Technical Documentation",
    audience: "OPSQAI engineers + advanced customer engineers",
    summary: "Codebase structure, contracts, background jobs, schema reference.",
    public: true,
    chapters: [
      { slug: "01-project-structure", title: "Project structure" },
      { slug: "02-auth-flow", title: "Authentication flow" },
      { slug: "03-license-flow", title: "License flow" },
      { slug: "04-ai-adapter-contract", title: "AI adapter contract" },
      { slug: "05-rag-pipeline", title: "RAG pipeline" },
      { slug: "06-embeddings", title: "Embeddings" },
      { slug: "07-storage-adapters", title: "Storage adapters" },
      { slug: "08-public-api", title: "Public API" },
      { slug: "09-deployment", title: "Deployment" },
      { slug: "10-background-jobs", title: "Background jobs" },
      { slug: "11-security-controls", title: "Security controls (technical)" },
      { slug: "12-database-schema-reference", title: "Database schema reference" },
    ],
  },
  {
    slug: "security-documentation",
    title: "Security Documentation",
    audience: "Customer CISO / security architect",
    summary: "Controls, threat model, DR, GDPR, incident response.",
    public: true,
    chapters: [
      { slug: "01-overview", title: "Security overview" },
      { slug: "02-encryption", title: "Encryption" },
      { slug: "03-authentication", title: "Authentication" },
      { slug: "04-authorization", title: "Authorization" },
      { slug: "05-license-security", title: "License security" },
      { slug: "06-update-security", title: "Update security" },
      { slug: "07-backup-security", title: "Backup security" },
      { slug: "08-data-isolation", title: "Data isolation" },
      { slug: "09-privacy-gdpr", title: "Privacy & GDPR" },
      { slug: "10-logging-audit", title: "Logging & audit" },
      { slug: "11-incident-response", title: "Incident response" },
      { slug: "12-dr-bc", title: "DR & business continuity" },
      { slug: "13-threat-model", title: "Threat model" },
    ],
  },
  {
    slug: "architecture-book",
    title: "Architecture Book",
    audience: "Technical decision makers + engineers",
    summary: "Vision, decisions (ADRs), and why the platform is shaped this way.",
    public: true,
    chapters: [
      { slug: "01-vision", title: "Vision" },
      { slug: "02-architecture", title: "Architecture" },
      { slug: "03-data-flow", title: "Data flow" },
      { slug: "04-license-system", title: "License system" },
      { slug: "05-security", title: "Security" },
      { slug: "06-ai", title: "AI" },
      { slug: "07-knowledge-base", title: "Knowledge base" },
      { slug: "08-administration", title: "Administration" },
      { slug: "09-deployment", title: "Deployment" },
      { slug: "10-updates", title: "Updates" },
      { slug: "11-maintenance", title: "Maintenance" },
      { slug: "12-recovery", title: "Recovery" },
      { slug: "13-future-roadmap", title: "Future roadmap" },
    ],
  },
];

export function findBook(slug: string): DocBook | undefined {
  return DOC_BOOKS.find((b) => b.slug === slug);
}
