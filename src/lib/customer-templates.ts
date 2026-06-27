// Enterprise document templates. Each generates markdown from the customer profile.
// The AI Writing Assistant uses the same context for rewrites and tone shifts.

export interface CustomerContext {
  companyName: string;
  legalName?: string;
  address?: string;
  country?: string;
  industry?: string;
  website?: string;
  employees?: number | string;
  warehouses?: number | string;
  users?: number | string;
  languages?: string;
  timezone?: string;
  primaryContact?: string;
  technicalContact?: string;
  accountManager?: string;
  // commercial
  subscriptionPlan?: string;
  seats?: number | string;
  aiCredits?: string;
  extraStorage?: string;
  renewalDate?: string;
  contractStatus?: string;
  discounts?: string;
  billingFrequency?: string;
  commercialNotes?: string;
  // implementation
  pilot?: string;
  production?: string;
  goLive?: string;
  hypercare?: string;
  trainingStatus?: string;
  onboardingStatus?: string;
  onboardingPct?: number;
  // sla
  responseTime?: string;
  availability?: string;
  supportHours?: string;
  escalationLevels?: string;
  maintenanceWindows?: string;
  rpo?: string;
  rto?: string;
  supportContacts?: string;
  // ai
  embeddingModel?: string;
  languageModel?: string;
  semanticSearch?: string;
  rag?: string;
  citationEngine?: string;
  supportedLanguages?: string;
  chunkSize?: string;
  contextWindow?: string;
  aiCapabilities?: string;
}

export type TemplateKey =
  | "executive_summary"
  | "commercial_proposal"
  | "technical_proposal"
  | "implementation_plan"
  | "pilot_proposal"
  | "enterprise_overview"
  | "customer_success_plan"
  | "feature_matrix"
  | "security_overview"
  | "compliance_overview"
  | "gdpr_overview"
  | "architecture_overview"
  | "deployment_guide"
  | "sla"
  | "training_plan"
  | "support_plan"
  | "onboarding_guide"
  | "renewal_summary";

export interface TemplateDef {
  key: TemplateKey;
  label: string;
  category: "Commercial" | "Technical" | "Compliance" | "Customer Success";
  description: string;
  build: (ctx: CustomerContext) => string;
}

const v = (x: unknown, fallback = "—") => {
  const s = x === undefined || x === null || x === "" ? "" : String(x);
  return s || fallback;
};

const header = (ctx: CustomerContext, title: string) => `# ${title}
**Prepared for:** ${v(ctx.companyName)}
**Legal entity:** ${v(ctx.legalName, v(ctx.companyName))}
**Industry:** ${v(ctx.industry)}
**Generated:** ${new Date().toISOString().slice(0, 10)}
`;

const profileBlock = (ctx: CustomerContext) => `## Customer Profile
| Field | Value |
| --- | --- |
| Company | ${v(ctx.companyName)} |
| Legal name | ${v(ctx.legalName)} |
| Address | ${v(ctx.address)} |
| Country | ${v(ctx.country)} |
| Industry | ${v(ctx.industry)} |
| Website | ${v(ctx.website)} |
| Employees | ${v(ctx.employees)} |
| Warehouses | ${v(ctx.warehouses)} |
| Users | ${v(ctx.users)} |
| Languages | ${v(ctx.languages)} |
| Timezone | ${v(ctx.timezone)} |
| Primary contact | ${v(ctx.primaryContact)} |
| Technical contact | ${v(ctx.technicalContact)} |
| Account manager | ${v(ctx.accountManager)} |
`;

export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  executive_summary: {
    key: "executive_summary", label: "Executive Summary", category: "Commercial",
    description: "C-level overview tailored to the customer.",
    build: (ctx) => `${header(ctx, "Executive Summary")}

## Why OPSQAI for ${v(ctx.companyName)}
OPSQAI delivers an enterprise Operational Knowledge Intelligence platform that gives ${v(ctx.companyName)}'s ${v(ctx.employees, "teams")} employees instant access to verified company knowledge across ${v(ctx.warehouses, "all")} warehouses.

## Strategic Outcomes
- Reduce time spent searching for SOPs and policies
- Increase first-time-right rate in operations
- Standardize training across sites in ${v(ctx.languages, "multiple languages")}
- Strengthen compliance posture (GDPR, ISO 27001, SOC 2 Ready)

## Recommended Plan
- **Subscription:** ${v(ctx.subscriptionPlan)}
- **Seats:** ${v(ctx.seats)}
- **Contract status:** ${v(ctx.contractStatus)}
- **Renewal:** ${v(ctx.renewalDate)}
`,
  },
  commercial_proposal: {
    key: "commercial_proposal", label: "Commercial Proposal", category: "Commercial",
    description: "Pricing, seats, terms, renewal.",
    build: (ctx) => `${header(ctx, "Commercial Proposal")}
${profileBlock(ctx)}

## Commercial Terms
| Item | Value |
| --- | --- |
| Subscription plan | ${v(ctx.subscriptionPlan)} |
| Seats | ${v(ctx.seats)} |
| Additional AI credits | ${v(ctx.aiCredits)} |
| Extra storage | ${v(ctx.extraStorage)} |
| Billing frequency | ${v(ctx.billingFrequency)} |
| Discounts | ${v(ctx.discounts)} |
| Contract status | ${v(ctx.contractStatus)} |
| Renewal date | ${v(ctx.renewalDate)} |

## Notes
${v(ctx.commercialNotes, "No additional commercial notes.")}
`,
  },
  technical_proposal: {
    key: "technical_proposal", label: "Technical Proposal", category: "Technical",
    description: "Architecture, AI stack, integrations.",
    build: (ctx) => `${header(ctx, "Technical Proposal")}

## Platform Architecture
OPSQAI is a multi-tenant SaaS built on hardened Postgres with strict workspace isolation and pgvector-powered semantic search.

## AI Configuration
| Setting | Value |
| --- | --- |
| Language model | ${v(ctx.languageModel)} |
| Embedding model | ${v(ctx.embeddingModel)} |
| Semantic search | ${v(ctx.semanticSearch)} |
| RAG | ${v(ctx.rag)} |
| Citation engine | ${v(ctx.citationEngine)} |
| Supported languages | ${v(ctx.supportedLanguages)} |
| Chunk size | ${v(ctx.chunkSize)} |
| Context window | ${v(ctx.contextWindow)} |
| Capabilities | ${v(ctx.aiCapabilities)} |
`,
  },
  implementation_plan: {
    key: "implementation_plan", label: "Implementation Plan", category: "Customer Success",
    description: "Phased rollout with milestones.",
    build: (ctx) => `${header(ctx, "Implementation Plan")}

## Phases
1. **Pilot** — ${v(ctx.pilot)}
2. **Production** — ${v(ctx.production)}
3. **Go-Live** — ${v(ctx.goLive)}
4. **Hypercare** — ${v(ctx.hypercare)}

## Status
- Onboarding: ${v(ctx.onboardingStatus)} (${v(ctx.onboardingPct, "0")}%)
- Training: ${v(ctx.trainingStatus)}
`,
  },
  pilot_proposal: {
    key: "pilot_proposal", label: "Pilot Proposal", category: "Commercial",
    description: "Time-boxed pilot plan with success criteria.",
    build: (ctx) => `${header(ctx, "Pilot Proposal")}

## Scope
A focused pilot for ${v(ctx.companyName)} covering up to ${v(ctx.seats, "25")} pilot users in ${v(ctx.warehouses, "one")} warehouse.

## Success Criteria
- AI answers grounded in ${v(ctx.companyName)} SOPs with citations
- Reduction in policy-lookup time
- Knowledge gaps captured and resolved during pilot
`,
  },
  enterprise_overview: {
    key: "enterprise_overview", label: "Enterprise Overview", category: "Commercial",
    description: "Comprehensive enterprise capability brief.",
    build: (ctx) => `${header(ctx, "Enterprise Overview")}
${profileBlock(ctx)}

OPSQAI is positioned as the operational knowledge backbone for ${v(ctx.industry, "your industry")}.
`,
  },
  customer_success_plan: {
    key: "customer_success_plan", label: "Customer Success Plan", category: "Customer Success",
    description: "QBR cadence, adoption goals, escalation.",
    build: (ctx) => `${header(ctx, "Customer Success Plan")}

## Cadence
- Quarterly Business Review with ${v(ctx.accountManager, "the account manager")}
- Monthly adoption checkpoint
- Hypercare window: ${v(ctx.hypercare)}

## Adoption Goals
- 80%+ active weekly users
- < 5% knowledge-gap rate after 90 days
`,
  },
  feature_matrix: {
    key: "feature_matrix", label: "Feature Matrix", category: "Technical",
    description: "Per-customer enabled features.",
    build: (ctx) => `${header(ctx, "Feature Matrix")}

The feature matrix for ${v(ctx.companyName)} is maintained in the Customer Workspace Manager and exported alongside this document.
`,
  },
  security_overview: {
    key: "security_overview", label: "Security Overview", category: "Compliance",
    description: "Security posture & controls.",
    build: (ctx) => `${header(ctx, "Security Overview")}

Security posture for ${v(ctx.companyName)}. Detailed controls are maintained per area in the Customer Workspace Manager.
`,
  },
  compliance_overview: {
    key: "compliance_overview", label: "Compliance Overview", category: "Compliance",
    description: "All compliance areas with status.",
    build: (ctx) => `${header(ctx, "Compliance Overview")}

Compliance status for ${v(ctx.companyName)} across GDPR, ISO 27001, ISO 9001 and SOC 2 Ready. Status per area is maintained in the Compliance Center.
`,
  },
  gdpr_overview: {
    key: "gdpr_overview", label: "GDPR Overview", category: "Compliance",
    description: "GDPR-specific overview.",
    build: (ctx) => `${header(ctx, "GDPR Overview")}

## Data Processing
- **Controller:** ${v(ctx.legalName, v(ctx.companyName))}
- **Residency:** ${v(ctx.country)}
- **Workspace isolation:** Enforced via Row-Level Security
- **Sub-processors:** Disclosed in the trust center
`,
  },
  architecture_overview: {
    key: "architecture_overview", label: "Architecture Overview", category: "Technical",
    description: "High-level architecture.",
    build: (ctx) => `${header(ctx, "Architecture Overview")}

Multi-tenant SaaS, Postgres + pgvector, server-side RAG, RBAC enforced at the database layer.
Active workspaces, including ${v(ctx.companyName)}, are isolated by RLS policies.
`,
  },
  deployment_guide: {
    key: "deployment_guide", label: "Deployment Guide", category: "Technical",
    description: "Deployment and rollout guide.",
    build: (ctx) => `${header(ctx, "Deployment Guide")}

Steps to deploy OPSQAI for ${v(ctx.companyName)} across ${v(ctx.warehouses, "all sites")}.
`,
  },
  sla: {
    key: "sla", label: "Service Level Agreement", category: "Compliance",
    description: "SLA targets and support windows.",
    build: (ctx) => `${header(ctx, "Service Level Agreement")}

| Metric | Target |
| --- | --- |
| Response time | ${v(ctx.responseTime)} |
| Availability | ${v(ctx.availability)} |
| Support hours | ${v(ctx.supportHours)} |
| Escalation levels | ${v(ctx.escalationLevels)} |
| Maintenance windows | ${v(ctx.maintenanceWindows)} |
| RPO | ${v(ctx.rpo)} |
| RTO | ${v(ctx.rto)} |
| Support contacts | ${v(ctx.supportContacts)} |
`,
  },
  training_plan: {
    key: "training_plan", label: "Training Plan", category: "Customer Success",
    description: "Role-based training curriculum.",
    build: (ctx) => `${header(ctx, "Training Plan")}

Training curriculum for ${v(ctx.companyName)} delivered via OPSQAI Academy in ${v(ctx.languages, "the customer's languages")}.
`,
  },
  support_plan: {
    key: "support_plan", label: "Support Plan", category: "Customer Success",
    description: "Support workflows, channels and contacts.",
    build: (ctx) => `${header(ctx, "Support Plan")}

Support hours: ${v(ctx.supportHours)}.
Primary contact: ${v(ctx.primaryContact)}.
Technical contact: ${v(ctx.technicalContact)}.
`,
  },
  onboarding_guide: {
    key: "onboarding_guide", label: "Onboarding Guide", category: "Customer Success",
    description: "End-to-end onboarding workflow.",
    build: (ctx) => `${header(ctx, "Onboarding Guide")}

Onboarding progress for ${v(ctx.companyName)}: ${v(ctx.onboardingPct, "0")}%.
`,
  },
  renewal_summary: {
    key: "renewal_summary", label: "Renewal Summary", category: "Commercial",
    description: "Renewal brief with value realized.",
    build: (ctx) => `${header(ctx, "Renewal Summary")}

Renewal date: ${v(ctx.renewalDate)}.
Contract status: ${v(ctx.contractStatus)}.
`,
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

export function buildContextFromProfile(
  companyName: string,
  profile: { general?: Record<string, unknown>; commercial?: Record<string, unknown>; implementation?: Record<string, unknown>; ai_config?: Record<string, unknown>; sla?: Record<string, unknown>; onboarding_pct?: number; contract_status?: string; renewal_date?: string | null } | null,
): CustomerContext {
  const g = (profile?.general ?? {}) as Record<string, unknown>;
  const c = (profile?.commercial ?? {}) as Record<string, unknown>;
  const i = (profile?.implementation ?? {}) as Record<string, unknown>;
  const a = (profile?.ai_config ?? {}) as Record<string, unknown>;
  const s = (profile?.sla ?? {}) as Record<string, unknown>;
  const pick = (o: Record<string, unknown>, k: string) => (o[k] === undefined ? undefined : String(o[k]));
  return {
    companyName,
    legalName: pick(g, "legalName"),
    address: pick(g, "address"),
    country: pick(g, "country"),
    industry: pick(g, "industry"),
    website: pick(g, "website"),
    employees: pick(g, "employees"),
    warehouses: pick(g, "warehouses"),
    users: pick(g, "users"),
    languages: pick(g, "languages"),
    timezone: pick(g, "timezone"),
    primaryContact: pick(g, "primaryContact"),
    technicalContact: pick(g, "technicalContact"),
    accountManager: pick(g, "accountManager"),
    subscriptionPlan: pick(c, "subscriptionPlan"),
    seats: pick(c, "seats"),
    aiCredits: pick(c, "aiCredits"),
    extraStorage: pick(c, "extraStorage"),
    renewalDate: profile?.renewal_date ?? undefined,
    contractStatus: profile?.contract_status,
    discounts: pick(c, "discounts"),
    billingFrequency: pick(c, "billingFrequency"),
    commercialNotes: pick(c, "notes"),
    pilot: pick(i, "pilot"),
    production: pick(i, "production"),
    goLive: pick(i, "goLive"),
    hypercare: pick(i, "hypercare"),
    trainingStatus: pick(i, "trainingStatus"),
    onboardingStatus: pick(i, "onboardingStatus"),
    onboardingPct: profile?.onboarding_pct,
    responseTime: pick(s, "responseTime"),
    availability: pick(s, "availability"),
    supportHours: pick(s, "supportHours"),
    escalationLevels: pick(s, "escalationLevels"),
    maintenanceWindows: pick(s, "maintenanceWindows"),
    rpo: pick(s, "rpo"),
    rto: pick(s, "rto"),
    supportContacts: pick(s, "supportContacts"),
    embeddingModel: pick(a, "embeddingModel"),
    languageModel: pick(a, "languageModel"),
    semanticSearch: pick(a, "semanticSearch"),
    rag: pick(a, "rag"),
    citationEngine: pick(a, "citationEngine"),
    supportedLanguages: pick(a, "supportedLanguages"),
    chunkSize: pick(a, "chunkSize"),
    contextWindow: pick(a, "contextWindow"),
    aiCapabilities: pick(a, "aiCapabilities"),
  };
}
