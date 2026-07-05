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
    "GDPR by design. Application database in AWS eu-west-1 (Dublin, Ireland).",
    "OPSQAI itself is not currently SOC 2 or ISO/IEC 27001 certified.",
    "Infrastructure subprocessor Lovable is SOC 2 Type II and ISO/IEC 27001:2022 certified (confirmed August 2025).",
    "Transfers outside the EEA (e.g., to Google or OpenAI as AI model providers) are safeguarded by Standard Contractual Clauses under Art. 46 GDPR.",
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
