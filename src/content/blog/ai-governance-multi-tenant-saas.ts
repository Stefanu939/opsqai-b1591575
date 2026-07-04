import type { BlogPost } from "./_types";

export const post: BlogPost = {
  slug: "ai-governance-multi-tenant-saas",
  title: "AI Governance for Multi-Tenant SaaS",
  description:
    "A pragmatic governance stack for AI features in multi-tenant SaaS: RLS, audit, refusal, retention, and prompt/data separation.",
  pillar: "Governance",
  keywords: "AI governance, multi-tenant AI, SaaS AI governance, RLS AI",
  datePublished: "2026-06-28",
  author: { name: "OPSQAI Editorial", role: "Security" },
  readingMinutes: 7,
  lede:
    "Governance for multi-tenant AI is not a checklist — it is an architecture. Five properties matter: isolation, refusal, audit, retention, and separation of prompt from data.",
  sections: [
    {
      heading: "Isolation at the database, not the UI",
      paragraphs: [
        "Every access decision in a multi-tenant AI product must be enforced at the storage layer with row-level security. Application code will eventually contain a bug that leaks cross-tenant data; the database policy will not.",
      ],
    },
    {
      heading: "Refusal as a governance feature",
      paragraphs: [
        "Governance frameworks care about accuracy. In an AI product, the honest failure mode is refusal: 'the sources do not support this answer' is a safer output than a plausible fabrication. Design refusal into the pipeline, not around it.",
      ],
    },
    {
      heading: "Audit that survives a review",
      paragraphs: [
        "The audit log needs to capture the prompt, the retrieved passages (with versions), the response, the operator, and any admin actions taken against the workspace. Append-only, tamper-evident, exportable.",
      ],
    },
    {
      heading: "Retention and separation",
      paragraphs: [
        "Prompt content and source content live in different retention regimes. Prompts are often personal data; sources are usually corporate IP. Treating them as one bucket creates GDPR exposure that never should have existed.",
      ],
    },
  ],
  relatedLandingPages: ["/solutions/operational-knowledge-platform", "/trust/multi-tenant-isolation"],
};
