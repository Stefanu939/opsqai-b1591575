import type { BlogPost } from "./_types";

export const post: BlogPost = {
  slug: "audit-ready-knowledge-base",
  title: "Building an Audit-Ready Knowledge Base (Architectural Readiness, Not a Certification)",
  description:
    "An audit-ready knowledge base is not a wiki with a policy PDF attached. Here is the minimum architecture. Note: OPSQAI itself is not yet SOC 2 or ISO 27001 certified — this is about architecture, not certification.",
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
        "Every internal or external audit eventually asks the reconstruction question. Given a specific date, a specific operator, and a specific query — show me what the system returned, why, and from which sources. To pass it, the platform must retain the prompt, the retrieved sources with their versions, the response, the operator identity, and the time. Missing any one of those fields and the reconstruction is a story, not evidence.",
        "Retention has to survive workspace deletion, employee turnover, and content republication. When a tenant offboards, the anonymised audit metadata should still be reconstructable for the audit horizon defined in the DPA. When an employee leaves, their queries do not vanish — they are re-attributed to an anonymised principal. When an SOP is republished, the old version is preserved and citations continue to resolve to it.",
        "Teams that pass this test the first time built the log with these constraints in mind. Teams that fail it usually built a log that was optimised for debugging and never re-scoped for audit. The two are not the same log.",
      ],
    },
    {
      heading: "Versioned sources are not optional",
      paragraphs: [
        "If the SOP changed last month, the audit needs to know which version answered last month's query. That means sources are versioned by default and old versions are retained for the audit horizon — not overwritten. Immutable version references travel with every citation and every log entry.",
        "The mechanism has to be automatic. Any workflow that asks a content owner to remember to preserve the old version before publishing a new one will fail on the first busy Friday. Versioning happens on publish, retention runs on a schedule, and the app never offers a 'delete this version' button that a human can press by accident.",
      ],
    },
    {
      heading: "Access decisions at the database",
      paragraphs: [
        "Access controls that live only in the UI will fail an audit the first time application code has a bug. Row-level security in the database is the only durable answer. OPSQAI enforces workspace boundaries in PostgreSQL RLS, not in React. When a route guard eventually ships broken, the RLS policy is what keeps a workspace boundary intact.",
        "The corollary is that any query touching tenant data must run under the caller's identity. Service-role bypasses exist for administrative and background paths — they are audited on their own, and every use is logged with a reason. If the audit reviewer cannot see who ran a service-role query and why, that is a finding.",
      ],
    },
    {
      heading: "Append-only logging, in practice",
      paragraphs: [
        "The audit log has three properties that separate a real one from a debugging log with a nice name. First, INSERT-only at the database — UPDATE and DELETE privileges are revoked, not just unused. Second, tamper-evident by hash chaining or by a signed export cadence, so a reviewer can verify the log has not been rewritten. Third, redaction-aware: personal data appears in the log only where necessary, and lawful deletion (a GDPR erasure) is done by replacing content with a redaction marker, not by removing rows.",
        "None of the three is difficult once decided up front. All three are painful to add later. The audit posture of a system usually reflects the assumptions of its first migration.",
      ],
    },
    {
      heading: "What auditors actually ask for",
      paragraphs: [
        "In real audits, three requests come up repeatedly. 'Show me the response the system gave to query X on date Y' — the reconstruction test above. 'Show me who has acknowledged the current version of SOP N' — an ownership and training question that lives at the intersection of KM and HR. 'Show me the deletions and admin actions on this workspace for the last twelve months' — a governance question that decides whether the log is trustworthy.",
        "A KB that can answer all three within an hour is architecturally audit-ready, regardless of whether the vendor holds a certification badge. A KB that cannot answer any of them is not audit-ready, regardless of what the sales deck says.",
      ],
    },
  ],
  relatedLandingPages: ["/solutions/enterprise-knowledge-base", "/trust/audit-logs"],
};
