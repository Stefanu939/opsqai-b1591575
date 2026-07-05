import type { BlogPost } from "./_types";

export const post: BlogPost = {
  slug: "audit-ready-knowledge-base",
  title: "Building an Audit-Ready Knowledge Base",
  description:
    "An audit-ready knowledge base is not a wiki with a policy PDF attached. Here is the minimum architecture.",
  pillar: "Compliance",
  keywords: "audit-ready knowledge base, ISO knowledge management, compliance knowledge base",
  datePublished: "2026-07-03",
  author: { name: "OPSQAI Editorial", role: "Compliance" },
  readingMinutes: 6,
  lede:
    "An audit-ready knowledge base is one that can answer a specific question: what did this system tell this operator on this day? If you cannot answer that in ten minutes, you are not audit-ready. Note: OPSQAI itself is not currently SOC 2 or ISO/IEC 27001 certified — this article is about architectural readiness, not a certification claim (see the Trust Center for OPSQAI's certification status).",
  sections: [
    {
      heading: "The reconstruction test",
      paragraphs: [
        "Every internal or external audit eventually asks the reconstruction question. To pass it, the platform must retain the prompt, the retrieved sources with their versions, the response, the operator identity, and the time.",
        "Retention has to survive workspace deletion, employee turnover, and content republication.",
      ],
    },
    {
      heading: "Versioned sources are not optional",
      paragraphs: [
        "If the SOP changed last month, the audit needs to know which version answered last month's query. That means sources are versioned by default and old versions are retained for the audit horizon — not overwritten.",
      ],
    },
    {
      heading: "Access decisions at the database",
      paragraphs: [
        "Access controls that live only in the UI will fail an audit the first time application code has a bug. Row-level security in the database is the only durable answer. OPSQAI enforces workspace boundaries in PostgreSQL RLS, not in React.",
      ],
    },
  ],
  relatedLandingPages: ["/solutions/enterprise-knowledge-base", "/trust/audit-logs"],
};
