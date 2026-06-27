// Curated OPSQAI facts — the ONLY product knowledge the document generator
// is allowed to use. Keep this short, accurate, and free of any claims that
// would require legal/commercial sign-off.

export const OPSQAI_FACTS = {
  productName: "OPSQAI",
  tagline: "Operational Knowledge Intelligence — instant access to verified company knowledge.",
  vendor: "OPSQAI",
  website: "https://opsqai.de",
  contact: "hello@opsqai.de",
  description:
    "OPSQAI is a multi-tenant SaaS knowledge assistant for logistics and warehouse operations. It indexes SOPs, manuals, policies and FAQs into a per-customer knowledge base and answers employee questions with source-grounded citations.",
  positioning: [
    "Source-grounded answers (refusal when no source is found).",
    "Per-workspace data isolation enforced at the database layer (Row-Level Security).",
    "Bilingual interface (DE/EN/RO) with multilingual AI responses.",
    "Confidence scoring, knowledge gap tracking, audit log.",
  ],
  architecture: [
    "Multi-tenant Postgres with workspace-scoped RLS policies.",
    "pgvector-powered semantic search.",
    "Server-side RAG with recursive chunking and citation extraction.",
    "Enterprise RBAC with 7 roles (platform_owner → operator).",
  ],
  security: [
    "All data is encrypted in transit (TLS 1.2+).",
    "Database encryption at rest.",
    "Audit log for sensitive actions.",
    "Daily managed backups and point-in-time recovery.",
  ],
  compliance: [
    "GDPR by design (data residency in the EU).",
    "ISO 27001 roadmap.",
    "SOC 2 Type II ready.",
  ],
  branding: {
    primary: "#2563EB",
    accent: "#14B8A6",
    surface: "#0F172A",
  },
} as const;

export function opsqaiFactsBlock(): string {
  return JSON.stringify(OPSQAI_FACTS, null, 2);
}
