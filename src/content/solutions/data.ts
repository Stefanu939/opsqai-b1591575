/**
 * Commercial landing pages served at /solutions/$slug.
 * Each entry is grounded in real OPSQAI capabilities.
 * Tone: executive / technical (Deloitte-style).
 */

export interface SolutionSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface SolutionPage {
  slug: string;
  title: string; // page <title>
  h1: string; // on-page heading
  description: string; // meta description
  keywords: string;
  eyebrow: string;
  lede: string;
  sections: SolutionSection[];
  capabilities: { title: string; body: string }[];
  faq?: { question: string; answer: string }[];
  relatedLandingPages?: { path: string; label: string }[];
}

const OPSQAI_CATEGORY = "Enterprise AI · Knowledge Management";

export const SOLUTION_PAGES: SolutionPage[] = [
  {
    slug: "enterprise-ai-for-logistics",
    title: "Enterprise AI for Logistics — Grounded, Auditable, Multilingual",
    h1: "Enterprise AI for logistics operations",
    description:
      "OPSQAI is enterprise AI built for logistics: grounded on your SOPs and manuals, multilingual on the floor, and auditable end-to-end. Deploy across warehouses without loss of control.",
    keywords: "enterprise AI logistics, AI for supply chain, warehouse AI platform, grounded AI, auditable AI",
    eyebrow: "Enterprise AI · Logistics",
    lede:
      "Logistics operations run on institutional knowledge — SOPs, safety rules, exception playbooks, tribal knowledge on the floor. OPSQAI operationalises that knowledge as an enterprise-grade AI layer (OPSQAI itself is not yet SOC 2 or ISO 27001 certified — see the Trust Center): every answer is grounded in your own documents, cited to the source, and captured in an append-only audit log.",
    sections: [
      {
        heading: "Why generic AI fails on the warehouse floor",
        paragraphs: [
          "Consumer LLM assistants hallucinate confidently. On a distribution site, a confident-but-wrong answer about a dangerous goods class, a lock-out procedure or a customer-specific packing rule is a compliance and safety incident, not a UX problem.",
          "OPSQAI is designed around a different constraint: the assistant is only allowed to answer from your ingested SOPs, manuals, FAQs and operational documents. When it cannot ground an answer, it refuses — and the refusal opens a knowledge-gap ticket instead of a fabricated response.",
        ],
      },
      {
        heading: "Operational impact",
        paragraphs: [
          "OPSQAI reduces onboarding time, cuts shift-lead interruptions, standardises answers across sites and creates a defensible audit trail for internal and external reviews. All of this on multilingual mobile chat that operators actually use.",
        ],
        bullets: [
          "Grounded answers with verbatim source excerpts",
          "Multilingual chat — English, German, Romanian and expanding",
          "Append-only audit log across every workspace",
          "Multi-tenant isolation enforced at the database layer",
          "Refusal-first behaviour when sources are missing",
        ],
      },
    ],
    capabilities: [
      { title: "Grounded chat", body: "Every response cites the SOP section that produced it." },
      { title: "Knowledge base", body: "Ingest PDFs, Word, Excel, Confluence exports; version and re-index automatically." },
      { title: "Gap capture", body: "Refused answers convert into internal requests routed to knowledge owners." },
      { title: "Audit & compliance", body: "Immutable log of prompts, retrieved sources, exports and admin actions." },
    ],
    faq: [
      {
        question: "Is OPSQAI a wrapper around a public model?",
        answer:
          "No. OPSQAI is a retrieval-grounded platform. The underlying model is used strictly to synthesise answers from your ingested sources; the pipeline enforces citations, refusals and tenant isolation.",
      },
      {
        question: "Where is our data stored?",
        answer:
          "Data resides in EU-hosted infrastructure with per-tenant row-level security. Retention, export and deletion controls are documented in the Trust Center.",
      },
    ],
    relatedLandingPages: [
      { path: "/solutions/warehouse-ai-assistant", label: "Warehouse AI assistant" },
      { path: "/solutions/ai-knowledge-management", label: "AI knowledge management" },
      { path: "/trust", label: "Trust Center" },
    ],
  },
  {
    slug: "warehouse-ai-assistant",
    title: "Warehouse AI Assistant — Grounded Answers on the Floor",
    h1: "A warehouse AI assistant that works on the floor",
    description:
      "OPSQAI puts a grounded AI assistant in every operator's hand. Mobile-first, multilingual, cited to your SOPs — no hallucinations, no wrong answers about safety or process.",
    keywords: "warehouse AI assistant, operator chatbot, SOP assistant, mobile warehouse AI",
    eyebrow: "Warehouse AI assistant",
    lede:
      "OPSQAI's assistant is designed for shop-floor conditions: mobile-first, multilingual, tolerant of imperfect queries, and always cited to your own SOPs. Operators get answers in seconds; team leaders stop being pulled off the line to repeat the same procedure.",
    sections: [
      {
        heading: "Designed for the floor, not the desk",
        paragraphs: [
          "Operators type in their own language, often on a shared tablet or a personal phone. Answers surface in the same language, with a verbatim excerpt from the SOP and a link to the section.",
          "When a query is ambiguous, the assistant asks a short clarifying question. When the sources genuinely do not cover the topic, it refuses and opens an internal request — the operator is never left with a guess.",
        ],
      },
      {
        heading: "Deployment pattern",
        paragraphs: [
          "Most sites launch by connecting existing SOP repositories, importing the top 20–50 most-consulted documents, and turning the assistant on for a pilot shift. Rollout across additional sites is a workspace clone with a fresh knowledge base scope.",
        ],
      },
    ],
    capabilities: [
      { title: "Mobile-first UI", body: "Responsive chat, works offline for the last active thread." },
      { title: "EN / DE / RO", body: "Operator asks in one language, source is in another — OPSQAI bridges both." },
      { title: "Citations by default", body: "Answers ship with the paragraph they came from." },
      { title: "Shift handover", body: "Threads persist and are searchable across shifts." },
    ],
    relatedLandingPages: [
      { path: "/solutions/warehouse-sop-software", label: "Warehouse SOP software" },
      { path: "/solutions/ai-for-warehouse-operations", label: "AI for warehouse operations" },
    ],
  },
  {
    slug: "ai-knowledge-management",
    title: "AI Knowledge Management — Turn SOPs Into Live Systems",
    h1: "AI knowledge management for operational teams",
    description:
      "OPSQAI is knowledge management with an AI front-end: ingest, version and retrieve your SOPs, then let operators query them in natural language with verified citations.",
    keywords: "AI knowledge management, enterprise knowledge base, semantic search SOP",
    eyebrow: "AI knowledge management",
    lede:
      "Traditional knowledge bases die in wiki graveyards. OPSQAI is designed around retrieval — every document is chunked, embedded and version-tracked, and every query is answered from those chunks with an audit trail of what was used.",
    sections: [
      {
        heading: "From wiki to live system",
        paragraphs: [
          "A knowledge base is only valuable if people can find what they need at the moment they need it. OPSQAI replaces keyword search with semantic retrieval: users ask a question, the platform returns the passages that answer it, and the AI synthesises a plain-language response.",
          "When a document changes, OPSQAI re-indexes it automatically and version history is preserved. Answers cite a specific version, so audit questions like 'what did the SOP say last quarter?' have a defensible answer.",
        ],
      },
    ],
    capabilities: [
      { title: "Semantic search", body: "Embedding-based retrieval, not brittle keyword matching." },
      { title: "Version history", body: "Every ingested document keeps its version chain." },
      { title: "Owner routing", body: "Documents belong to a team; changes route to that owner for approval." },
    ],
    relatedLandingPages: [
      { path: "/solutions/enterprise-knowledge-base", label: "Enterprise knowledge base" },
      { path: "/solutions/operational-knowledge-platform", label: "Operational knowledge platform" },
    ],
  },
  {
    slug: "operational-knowledge-platform",
    title: "Operational Knowledge Platform — Governance-First, Multi-Site",
    h1: "The operational knowledge platform for enterprises",
    description:
      "OPSQAI unifies operational knowledge — SOPs, safety, exception playbooks, tribal know-how — into a single multi-tenant platform with strict isolation and enterprise governance.",
    keywords: "operational knowledge platform, multi-site knowledge base, enterprise ops",
    eyebrow: "Operational knowledge platform",
    lede:
      "Operational knowledge is scattered — SharePoint folders, PDFs on shared drives, team-lead notebooks, group chats. OPSQAI collapses that surface into a single retrieval layer with strict tenant isolation and enterprise-grade governance (OPSQAI itself is not yet SOC 2 or ISO 27001 certified — see the Trust Center).",
    sections: [
      {
        heading: "Governance and tenancy",
        paragraphs: [
          "Every workspace is a hard-isolated tenant enforced at the database layer with row-level security. Platform administrators can traverse workspaces via an explicit switcher; operational users never see across the boundary.",
          "Role-based access control governs who can ingest, edit, publish and export. All actions land in the audit log.",
        ],
      },
    ],
    capabilities: [
      { title: "Multi-tenant RLS", body: "Isolation enforced in PostgreSQL, not in application code." },
      { title: "RBAC", body: "Owner, admin, editor, viewer — with per-workspace overrides." },
      { title: "SSO-ready", body: "Roadmap includes SAML/SCIM for enterprise identity." },
    ],
    relatedLandingPages: [
      { path: "/solutions/ai-knowledge-management", label: "AI knowledge management" },
      { path: "/trust/multi-tenant-isolation", label: "Multi-tenant isolation" },
    ],
  },
  {
    slug: "warehouse-sop-software",
    title: "Warehouse SOP Software — Digitize, Version, Retrieve",
    h1: "Warehouse SOP software with a grounded AI front-end",
    description:
      "OPSQAI digitises warehouse SOPs and pairs them with a grounded AI assistant: version control, publishing workflow, acknowledgement tracking, and cited retrieval.",
    keywords: "warehouse SOP software, SOP management, SOP versioning, SOP acknowledgement",
    eyebrow: "Warehouse SOP software",
    lede:
      "OPSQAI treats SOPs as living operational assets: draft, review, publish, acknowledge, version, retire — with a grounded AI assistant sitting on top so operators can query them in seconds.",
    sections: [
      {
        heading: "The SOP lifecycle, digitised",
        paragraphs: [
          "Draft in the editor or upload from Word. Route to reviewers, publish with a version, require acknowledgement from named roles, and archive on supersession. Every step is timestamped and logged.",
        ],
      },
    ],
    capabilities: [
      { title: "Version control", body: "Every publish creates an immutable version reference." },
      { title: "Acknowledgement", body: "Track who has read and signed off on which SOP version." },
      { title: "Retrieval", body: "AI assistant cites the current published version by default." },
    ],
    relatedLandingPages: [
      { path: "/solutions/warehouse-documentation-software", label: "Warehouse documentation software" },
      { path: "/guides/how-to-digitize-warehouse-sops", label: "How to digitize warehouse SOPs" },
    ],
  },
  {
    slug: "warehouse-documentation-software",
    title: "Warehouse Documentation Software — Single Source of Truth",
    h1: "Warehouse documentation software your team will actually use",
    description:
      "OPSQAI is warehouse documentation software with an AI front-end: consolidate SOPs, manuals, safety data and FAQs into a single searchable, cited, auditable knowledge layer.",
    keywords: "warehouse documentation software, distribution center documentation, operational documentation",
    eyebrow: "Warehouse documentation",
    lede:
      "Documentation only helps operations when it is findable at the moment of use. OPSQAI consolidates warehouse documentation into a single retrieval-grounded layer with mobile-first access and enterprise governance.",
    sections: [
      {
        heading: "Consolidation and control",
        paragraphs: [
          "Import from Word, PDF, Excel, Confluence exports and SharePoint mirrors. OPSQAI chunks, embeds and versions each source, and preserves the original for legal reference.",
        ],
      },
    ],
    capabilities: [
      { title: "Multi-format ingest", body: "PDF, DOCX, XLSX, MD, HTML — plus URL sources." },
      { title: "Cited answers", body: "Operators see the excerpt that generated the answer." },
      { title: "Owner workflows", body: "Documents route to owners for review on change." },
    ],
    relatedLandingPages: [
      { path: "/solutions/warehouse-sop-software", label: "Warehouse SOP software" },
      { path: "/solutions/enterprise-knowledge-base", label: "Enterprise knowledge base" },
    ],
  },
  {
    slug: "ai-for-warehouse-operations",
    title: "AI for Warehouse Operations — Grounded, Auditable, On-Floor",
    h1: "AI for warehouse operations — designed for the floor",
    description:
      "OPSQAI applies enterprise AI to warehouse operations: grounded answers on the floor, gap capture, audit logs, and rollout patterns for multi-site distribution networks.",
    keywords: "AI for warehouse operations, warehouse AI, distribution AI",
    eyebrow: "AI for warehouse operations",
    lede:
      "OPSQAI is purpose-built for warehouse and distribution operations. Every capability — retrieval, refusal, multilingual output, gap capture, audit — is designed against real shop-floor constraints, not office productivity workflows.",
    sections: [
      {
        heading: "Where AI fits — and where it should refuse",
        paragraphs: [
          "AI belongs in the answer layer, not the source of truth. OPSQAI's role is to retrieve, cite and synthesise; the source of truth remains your controlled documents. When the sources cannot support an answer, OPSQAI refuses.",
        ],
      },
    ],
    capabilities: [
      { title: "Refusal-first", body: "No answer without a citable source." },
      { title: "Multi-site rollout", body: "Clone a workspace, scope the knowledge base per site." },
      { title: "Operations analytics", body: "See what operators are asking — and where SOPs are missing." },
    ],
    relatedLandingPages: [
      { path: "/solutions/ai-for-distribution-centers", label: "AI for distribution centers" },
      { path: "/solutions/warehouse-ai-assistant", label: "Warehouse AI assistant" },
    ],
  },
  {
    slug: "ai-for-distribution-centers",
    title: "AI for Distribution Centers — Cross-Site Consistency at Scale",
    h1: "AI for distribution centers and 3PL networks",
    description:
      "OPSQAI standardises answers across distribution centers: one platform, per-site knowledge scope, unified audit, multilingual output for cross-border operations.",
    keywords: "AI for distribution centers, 3PL AI, cross-site knowledge, multilingual warehouse AI",
    eyebrow: "AI for distribution centers",
    lede:
      "Distribution networks live and die by consistency. OPSQAI standardises operational answers across sites while preserving per-site sovereignty over knowledge, audit and access.",
    sections: [
      {
        heading: "Cross-site pattern",
        paragraphs: [
          "OPSQAI's tenancy model lets a 3PL run a shared workspace for corporate SOPs and per-site workspaces for local rules, with platform admins able to move between them. The audit trail is unified for the operator of the network.",
        ],
      },
    ],
    capabilities: [
      { title: "Per-site scope", body: "Knowledge bases isolated per site with corporate overlays." },
      { title: "Unified audit", body: "Cross-site queries and admin actions in one log." },
      { title: "Language bridging", body: "Corporate SOP in one language, operator asks in another." },
    ],
    relatedLandingPages: [
      { path: "/solutions/ai-for-warehouse-operations", label: "AI for warehouse operations" },
      { path: "/solutions/operational-knowledge-platform", label: "Operational knowledge platform" },
    ],
  },
  {
    slug: "operational-ai-platform",
    title: "Operational AI Platform — Built for Real Operations",
    h1: "The operational AI platform for asset-heavy industries",
    description:
      "OPSQAI is an operational AI platform for asset-heavy industries: retrieval-grounded, multi-tenant, auditable, governance-first (OPSQAI itself is not yet SOC 2 or ISO 27001 certified — see the Trust Center).",
    keywords: "operational AI platform, industrial AI, enterprise AI operations",
    eyebrow: "Operational AI platform",
    lede:
      "OPSQAI is the AI layer for teams whose day-to-day is defined by physical operations, safety rules and regulated procedures — warehousing, distribution, manufacturing support, field operations.",
    sections: [
      {
        heading: "Platform stance",
        paragraphs: [
          "OPSQAI is a platform, not a chatbot. Ingestion, retrieval, refusal, gap capture, audit, publishing and access control are first-class modules with an API surface.",
        ],
      },
    ],
    capabilities: [
      { title: "Modular architecture", body: "Chat, SOP, Academy, Audit, Gaps — used together or independently." },
      { title: "API-first", body: "Every module has an authenticated, RLS-enforced API surface." },
      { title: "Governance", body: "RBAC, audit, retention, export — the enterprise defaults, not add-ons." },
    ],
    relatedLandingPages: [
      { path: "/solutions/enterprise-ai-for-logistics", label: "Enterprise AI for logistics" },
      { path: "/product", label: "Product overview" },
    ],
  },
  {
    slug: "enterprise-knowledge-base",
    title: "Enterprise Knowledge Base — Retrieval-Grounded, Built for Audits",
    h1: "The enterprise knowledge base with AI you can defend",
    description:
      "OPSQAI is an enterprise knowledge base with retrieval-grounded AI, immutable audit, multi-tenant isolation, and role-based governance — built for regulated operations.",
    keywords: "enterprise knowledge base, audit-ready knowledge, retrieval-grounded AI",
    eyebrow: "Enterprise knowledge base",
    lede:
      "OPSQAI is designed for enterprises whose knowledge base has to hold up under an audit (OPSQAI itself is not yet SOC 2 or ISO 27001 certified — see the Trust Center): retrieval-grounded answers, immutable logs, versioned sources, and role-based access control from day one.",
    sections: [
      {
        heading: "What 'audit-ready' actually means (OPSQAI is not yet certified)",
        paragraphs: [
          "OPSQAI is not currently SOC 2 or ISO/IEC 27001 certified — we do not label the product 'audit-ready' as a certification claim. What the platform gives you is the substrate an audit expects: OPSQAI's audit log records the prompt, the retrieved passages, the AI response and the operator who received it — with tamper-evident append-only semantics. External auditors can reconstruct what the system told a specific role on a specific day.",
        ],
      },
    ],
    capabilities: [
      { title: "Immutable audit", body: "Append-only log of prompts, sources, responses and admin actions." },
      { title: "Versioned sources", body: "Answers reference a specific document version, retained indefinitely." },
      { title: "RBAC", body: "Access decisions enforced at the database, not the UI." },
    ],
    relatedLandingPages: [
      { path: "/trust/audit-logs", label: "Trust — audit logs" },
      { path: "/trust/gdpr", label: "Trust — GDPR" },
      { path: "/solutions/ai-knowledge-management", label: "AI knowledge management" },
    ],
  },
];

export function findSolution(slug: string): SolutionPage | undefined {
  return SOLUTION_PAGES.find((s) => s.slug === slug);
}

export { OPSQAI_CATEGORY };
