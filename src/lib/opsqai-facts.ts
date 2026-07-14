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
    "OPSQAI is a Windows on-premise, single-tenant knowledge assistant for logistics and warehouse operations. It indexes SOPs, manuals, policies and FAQs into a customer-owned knowledge base and answers employee questions with source-grounded citations.",
  positioning: [
    "Source-grounded answers (refusal when no source is found).",
    "Single-tenant install — one dedicated deployment per customer, no shared runtime.",
    "Bilingual interface (DE/EN/RO) with multilingual AI responses.",
    "Confidence scoring, knowledge gap tracking, audit log.",
  ],
  architecture: [
    "Single-tenant Postgres per install with workspace-scoped RLS policies.",
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
    "Infrastructure subprocessor's platform (Lovable) holds SOC 2 Type II and ISO 27001:2022 certifications at the company level. Our current subscription is Lovable's Pro tier; Business-tier contractual coverage is being confirmed and documentation is available on request.",
    "AI model providers routed through the Lovable AI Gateway — explicit models in use: Google Gemini (gemini-3-flash-preview, gemini-2.5-flash) for chat/retrieval, OpenAI gpt-5-mini for generation, gpt-4o-mini-tts for text-to-speech, text-embedding-3-small for embeddings.",
    "Transfers outside the EEA (e.g., to Google or OpenAI) are safeguarded by Standard Contractual Clauses under Art. 46 GDPR. Customer content is not used to train foundation models.",
    "Retention on termination: 30-day grace window, then automated pg_cron purge (ON DELETE CASCADE). Anonymized audit metadata (no user IDs, no payloads) is retained for a rolling 24 months in audit_log_terminated_archive.",
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
