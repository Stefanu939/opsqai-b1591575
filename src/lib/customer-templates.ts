// Enterprise document templates. Each generates a markdown skeleton from the
// customer profile; the server-side generator runs it through Lovable AI with
// a strict "senior management consultant" system prompt for polish.

export interface CustomerContext {
  // Identity
  companyName: string;
  legalName?: string;
  logoUrl?: string;
  industry?: string;
  warehouseType?: string;
  website?: string;
  address?: string;
  country?: string;
  countries?: string;
  registrationNumber?: string;
  vatNumber?: string;
  employees?: number | string;
  warehouses?: number | string;
  users?: number | string;
  purchasedLicenses?: number | string;
  languages?: string;
  preferredLanguage?: string;
  timezone?: string;

  // Contacts
  primaryContact?: string;
  technicalContact?: string;
  billingContact?: string;
  supportContact?: string;
  accountManager?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;

  // Workspace
  workspaceName?: string;
  language?: string;

  // Commercial
  subscriptionPlan?: string;
  seats?: number | string;
  aiCredits?: string;
  extraStorage?: string;
  billingFrequency?: string;
  billingInfo?: string;
  discounts?: string;
  commercialNotes?: string;
  contractStartDate?: string;
  contractStatus?: string;
  customerStatus?: string;
  renewalDate?: string;

  // Implementation / Project
  pilot?: string;
  production?: string;
  goLive?: string;
  hypercare?: string;
  trainingStatus?: string;
  onboardingStatus?: string;
  onboardingPct?: number;
  implementationNotes?: string;
  customerNotes?: string;

  // Branding
  brandPrimaryColor?: string;
  brandAccentColor?: string;

  // SLA
  responseTime?: string;
  availability?: string;
  supportHours?: string;
  escalationLevels?: string;
  maintenanceWindows?: string;
  rpo?: string;
  rto?: string;
  supportContacts?: string;

  // AI Config
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

export type DocCategory =
  | "Commercial"
  | "Contracts"
  | "Implementation"
  | "Training"
  | "Security"
  | "Compliance"
  | "Technical"
  | "Marketing"
  | "Internal"
  | "Generated"
  | "Archive";

export type TemplateKey =
  // Commercial
  | "executive_summary"
  | "commercial_proposal"
  | "quotation"
  | "pilot_proposal"
  | "business_case"
  | "roi_analysis"
  | "enterprise_overview"
  | "renewal_summary"
  // Marketing
  | "professional_brochure"
  | "executive_presentation"
  // Contracts
  | "service_agreement"
  | "data_processing_agreement"
  | "statement_of_work"
  | "project_charter"
  | "sla"
  // Implementation
  | "implementation_plan"
  | "deployment_roadmap"
  | "deployment_guide"
  | "project_timeline"
  | "customer_welcome_guide"
  | "onboarding_guide"
  | "meeting_minutes"
  | "customer_success_plan"
  | "support_plan"
  // Training
  | "training_plan"
  | "employee_quick_start"
  | "administrator_guide"
  // Security
  | "security_overview"
  // Compliance
  | "compliance_overview"
  | "gdpr_overview"
  | "data_protection_overview"
  // Technical
  | "technical_proposal"
  | "architecture_overview"
  | "feature_matrix"
  | "operational_assessment"
  | "ai_readiness_report";

export interface TemplateDef {
  key: TemplateKey;
  label: string;
  category: DocCategory;
  description: string;
  build: (ctx: CustomerContext) => string;
}

const v = (x: unknown, fallback = "Not configured") => {
  const s = x === undefined || x === null || x === "" ? "" : String(x).trim();
  return s || fallback;
};

const header = (ctx: CustomerContext, title: string) => `# ${title}
**Prepared for:** ${v(ctx.companyName)}
**Legal entity:** ${v(ctx.legalName, v(ctx.companyName))}
**Industry:** ${v(ctx.industry)}
**Document date:** ${new Date().toISOString().slice(0, 10)}
**Prepared by:** OPSQAI Customer Delivery
`;

const profileBlock = (ctx: CustomerContext) => `## Customer Profile
| Field | Value |
| --- | --- |
| Company | ${v(ctx.companyName)} |
| Legal name | ${v(ctx.legalName)} |
| Registration no. | ${v(ctx.registrationNumber)} |
| VAT no. | ${v(ctx.vatNumber)} |
| Address | ${v(ctx.address)} |
| Country / countries | ${v(ctx.countries, v(ctx.country))} |
| Industry | ${v(ctx.industry)} |
| Warehouse type | ${v(ctx.warehouseType)} |
| Employees | ${v(ctx.employees)} |
| Purchased licenses | ${v(ctx.purchasedLicenses, v(ctx.seats))} |
| Languages | ${v(ctx.languages)} |
| Timezone | ${v(ctx.timezone)} |
| Primary contact | ${v(ctx.primaryContact)} |
| Technical contact | ${v(ctx.technicalContact)} |
| Billing contact | ${v(ctx.billingContact)} |
| Support contact | ${v(ctx.supportContact)} |
| Account manager | ${v(ctx.accountManager)} |
`;

const commercialBlock = (ctx: CustomerContext) => `## Commercial Terms
| Item | Value |
| --- | --- |
| Subscription plan | ${v(ctx.subscriptionPlan)} |
| Purchased licenses | ${v(ctx.purchasedLicenses, v(ctx.seats))} |
| Additional AI credits | ${v(ctx.aiCredits)} |
| Extra storage | ${v(ctx.extraStorage)} |
| Billing frequency | ${v(ctx.billingFrequency)} |
| Billing information | ${v(ctx.billingInfo)} |
| Discounts | ${v(ctx.discounts)} |
| Contract start | ${v(ctx.contractStartDate)} |
| Contract status | ${v(ctx.contractStatus)} |
| Renewal | ${v(ctx.renewalDate)} |
`;

export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  // ---------------- COMMERCIAL ----------------
  executive_summary: {
    key: "executive_summary", label: "Executive Summary", category: "Commercial",
    description: "C-level overview tailored to the customer.",
    build: (ctx) => `${header(ctx, "Executive Summary")}

## Situation
${v(ctx.companyName)} operates ${v(ctx.warehouses, "multiple")} warehouse sites in the ${v(ctx.industry, "logistics")} sector with ${v(ctx.employees, "[employees]")} employees. Operational knowledge is fragmented across SOPs, training materials, policies and tribal know-how, creating onboarding friction and compliance exposure.

## Opportunity
OPSQAI consolidates that knowledge into a single, source-grounded AI assistant — giving every employee instant, verified answers in ${v(ctx.languages, "their language")}, with full audit trail.

## Recommendation
- Deploy OPSQAI under the ${v(ctx.subscriptionPlan)} plan for ${v(ctx.purchasedLicenses, v(ctx.seats))} licensed users.
- Begin with a structured pilot, followed by a phased rollout across ${v(ctx.warehouses, "all")} sites.
- Establish a quarterly business review cadence with ${v(ctx.accountManager, "the OPSQAI account team")}.

## Expected Outcomes (12 months)
- Reduction in time-to-answer for operational questions
- Faster employee onboarding and certification
- Demonstrable compliance posture: GDPR alignment (EU hosting in AWS eu-west-1 Dublin); infrastructure subprocessor Lovable is SOC 2 Type II and ISO/IEC 27001:2022 certified (OPSQAI itself is not yet certified)
- Measurable reduction in knowledge gaps and repeat questions
`,
  },
  commercial_proposal: {
    key: "commercial_proposal", label: "Commercial Proposal", category: "Commercial",
    description: "Formal commercial proposal with pricing structure.",
    build: (ctx) => `${header(ctx, "Commercial Proposal")}
${profileBlock(ctx)}

${commercialBlock(ctx)}

## Scope of Service
OPSQAI provides ${v(ctx.companyName)} with the ${v(ctx.subscriptionPlan)} subscription of its Operational Knowledge Intelligence platform, covering knowledge base, AI assistant, knowledge gaps, audit logs and standard analytics for ${v(ctx.purchasedLicenses, v(ctx.seats))} named users.

## Commercial Notes
${v(ctx.commercialNotes, "Standard commercial terms apply.")}

## Next Steps
1. Counter-sign this proposal.
2. Execute the Service Agreement and DPA.
3. Schedule the kickoff with ${v(ctx.accountManager, "Customer Success")}.
`,
  },
  quotation: {
    key: "quotation", label: "Quotation", category: "Commercial",
    description: "Short formal quotation document.",
    build: (ctx) => `${header(ctx, "Quotation")}

**Valid for 30 days from issue date.**

| # | Item | Quantity | Notes |
| --- | --- | --- | --- |
| 1 | OPSQAI ${v(ctx.subscriptionPlan)} subscription | ${v(ctx.purchasedLicenses, v(ctx.seats))} licenses | Annual |
| 2 | Additional AI credits | ${v(ctx.aiCredits, "—")} | Optional |
| 3 | Additional storage | ${v(ctx.extraStorage, "—")} | Optional |

**Billing frequency:** ${v(ctx.billingFrequency)}
**Billing contact:** ${v(ctx.billingContact, v(ctx.primaryContact))}
**Discounts applied:** ${v(ctx.discounts, "None")}
**Notes:** ${v(ctx.commercialNotes, "—")}
`,
  },
  pilot_proposal: {
    key: "pilot_proposal", label: "Pilot Proposal", category: "Commercial",
    description: "Time-boxed pilot plan with success criteria.",
    build: (ctx) => `${header(ctx, "Pilot Proposal")}

## Objective
Validate measurable operational impact of OPSQAI inside ${v(ctx.companyName)} within a focused, time-boxed pilot.

## Scope
- Up to ${v(ctx.seats, "25")} pilot users in ${v(ctx.warehouses, "one")} site
- Initial knowledge base seeded with priority SOPs
- Language: ${v(ctx.languages, "English")}

## Success Criteria
- ≥ 70% weekly active usage among pilot users
- ≥ 80% of AI answers grounded with verified citations
- Documented reduction in time-to-answer for top operational questions
- At least 10 knowledge gaps identified and closed

## Timeline
6 weeks: 1 week setup → 4 weeks active pilot → 1 week review and conversion.
`,
  },
  business_case: {
    key: "business_case", label: "Business Case", category: "Commercial",
    description: "Quantified business case for OPSQAI adoption.",
    build: (ctx) => `${header(ctx, "Business Case")}

## Strategic Rationale
${v(ctx.companyName)} faces growing pressure to standardize operations, reduce knowledge-loss risk and accelerate workforce ramp-up across ${v(ctx.warehouses, "its sites")}.

## Value Drivers
- **Time saved per employee per week** searching for SOPs and policies
- **Reduction in onboarding time** for new hires
- **Lower error rate** on regulated workflows
- **Compliance audit readiness** with full source citations and audit log
- **Knowledge retention** when experienced staff leave

## Investment Summary
- OPSQAI ${v(ctx.subscriptionPlan)} subscription, ${v(ctx.purchasedLicenses, v(ctx.seats))} licensed users.
- Implementation effort scoped in the accompanying Implementation Plan.

## Decision Criteria
The business case should be approved when projected annual operational value exceeds 3x the subscription cost — a benchmark consistently observed in OPSQAI deployments of similar scope.
`,
  },
  roi_analysis: {
    key: "roi_analysis", label: "ROI Analysis", category: "Commercial",
    description: "Return-on-investment model with conservative assumptions.",
    build: (ctx) => `${header(ctx, "ROI Analysis")}

## Scope
Estimate the 12-month return for ${v(ctx.companyName)} based on the ${v(ctx.subscriptionPlan)} plan with ${v(ctx.purchasedLicenses, v(ctx.seats))} users.

## Value Model
| Lever | Assumption | Annual Value |
| --- | --- | --- |
| Time saved searching for knowledge | minutes/user/day × users × working days | **[to be quantified with customer data]** |
| Faster onboarding | days saved per new hire × hires/year | **[to be quantified with customer data]** |
| Error reduction on regulated tasks | incidents avoided × cost per incident | **[to be quantified with customer data]** |
| Knowledge retention | reduced re-training cost | **[to be quantified with customer data]** |

## Approach
Final values must be agreed jointly with ${v(ctx.companyName)} based on baseline measurements. OPSQAI does not assert ROI figures without customer-validated inputs.
`,
  },
  enterprise_overview: {
    key: "enterprise_overview", label: "Enterprise Overview", category: "Commercial",
    description: "Comprehensive enterprise capability brief.",
    build: (ctx) => `${header(ctx, "Enterprise Overview")}
${profileBlock(ctx)}

## Platform Summary
OPSQAI is an enterprise Operational Knowledge Intelligence platform, purpose-built for logistics and warehouse operations. It is delivered as multi-tenant SaaS with strict workspace isolation enforced at the database layer.

## Why OPSQAI for ${v(ctx.companyName)}
- Source-grounded AI answers (no hallucinated content)
- Native multilingual support including ${v(ctx.languages, "key languages")}
- Confidence scoring, knowledge gap tracking, full audit log
- Enterprise RBAC across 7 roles
- GDPR by design with EU data residency
`,
  },
  renewal_summary: {
    key: "renewal_summary", label: "Renewal Summary", category: "Commercial",
    description: "Renewal brief with value realized.",
    build: (ctx) => `${header(ctx, "Renewal Summary")}

## Subscription
- Plan: ${v(ctx.subscriptionPlan)}
- Licenses: ${v(ctx.purchasedLicenses, v(ctx.seats))}
- Renewal date: ${v(ctx.renewalDate)}
- Current status: ${v(ctx.customerStatus, v(ctx.contractStatus))}

## Value Realized
A consolidated view of platform adoption, knowledge gaps closed, training completions and audit-log activity for ${v(ctx.companyName)} is maintained in the OPSQAI analytics workspace and should be referenced alongside this summary.

## Recommendation
${v(ctx.commercialNotes, "Renew at current scope. Re-evaluate license count after the next QBR.")}
`,
  },

  // ---------------- MARKETING ----------------
  professional_brochure: {
    key: "professional_brochure", label: "Professional Brochure", category: "Marketing",
    description: "Two-page brochure-style overview for the customer.",
    build: (ctx) => `${header(ctx, `OPSQAI for ${v(ctx.companyName)}`)}

## Operational Knowledge Intelligence — for ${v(ctx.industry, "Logistics & Warehouse Operations")}

OPSQAI gives every employee in ${v(ctx.companyName)} instant access to verified company knowledge, with full citations and audit trail.

## What You Get
- AI assistant grounded in your SOPs and policies
- Multilingual answers (${v(ctx.languages, "DE / EN / RO")})
- Knowledge gap tracking with manager workflow
- Enterprise audit log and RBAC
- OPSQAI Academy for onboarding and continuous learning

## Designed for the Enterprise
- EU data residency: application DB in AWS eu-west-1 (Dublin, Ireland)
- Infrastructure subprocessor Lovable is SOC 2 Type II + ISO/IEC 27001:2022 certified (Aug 2025)
- OPSQAI itself is not yet SOC 2 / ISO 27001 certified; DPA in draft, pending legal review
- Transfers outside the EEA (Google / OpenAI as AI model providers) safeguarded by Standard Contractual Clauses (Art. 46 GDPR)
- Row-Level Security workspace isolation

## How to Engage
Contact ${v(ctx.accountManager, "your OPSQAI account manager")} or visit https://opsqai.de.
`,
  },
  executive_presentation: {
    key: "executive_presentation", label: "Executive Presentation", category: "Marketing",
    description: "Slide-style talking points for an executive briefing.",
    build: (ctx) => `${header(ctx, "Executive Presentation — Talking Points")}

## Slide 1 — Why we are here
${v(ctx.companyName)} wants to scale operational knowledge without scaling friction.

## Slide 2 — The challenge
Fragmented SOPs. Multilingual workforce. High onboarding cost. Audit pressure.

## Slide 3 — OPSQAI in one line
The Operational Knowledge Intelligence platform that gives every employee instant, source-grounded answers.

## Slide 4 — How it works
Knowledge Base → semantic retrieval → grounded AI answer → citations.

## Slide 5 — Why this is different
We refuse to answer when we don't have the source — no hallucinations.

## Slide 6 — Proposed plan
${v(ctx.subscriptionPlan)} subscription for ${v(ctx.purchasedLicenses, v(ctx.seats))} users; phased rollout across ${v(ctx.warehouses, "all sites")}.

## Slide 7 — Outcomes in 90 days
Onboarded users, closed knowledge gaps, measurable time-to-answer reduction.

## Slide 8 — Next step
Sign Pilot Proposal and Service Agreement.
`,
  },

  // ---------------- CONTRACTS ----------------
  service_agreement: {
    key: "service_agreement", label: "Service Agreement", category: "Contracts",
    description: "Master service agreement skeleton (B2B Germany).",
    build: (ctx) => `${header(ctx, "Service Agreement")}
${profileBlock(ctx)}

## Parties
- **Customer:** ${v(ctx.legalName, v(ctx.companyName))} — ${v(ctx.address)}, ${v(ctx.country)}. Registration ${v(ctx.registrationNumber)}, VAT ${v(ctx.vatNumber)}.
- **Provider:** OPSQAI — https://opsqai.de.

## Subject Matter
Provision of the OPSQAI Operational Knowledge Intelligence platform under the ${v(ctx.subscriptionPlan)} subscription, including ${v(ctx.purchasedLicenses, v(ctx.seats))} licensed user accounts.

## Term
Initial term as of ${v(ctx.contractStartDate)} until ${v(ctx.renewalDate)}. Automatic renewal applies unless terminated with notice as defined in the standard OPSQAI terms.

## Fees and Payment
Per the executed Quotation / Commercial Proposal, payable in ${v(ctx.billingFrequency, "advance")} cycles.

## Service Levels
Service Levels are defined in the accompanying SLA document.

## Data Processing
The Data Processing Agreement forms an integral part of this Service Agreement.

## Governing Law
Subject to commercial agreement; the standard OPSQAI framework follows German law, with venue at the Provider's registered seat.

## Notice
> This document is a draft template. Final legal clauses must be reviewed and approved by qualified legal counsel before signature. OPSQAI does not provide legal advice.
`,
  },
  data_processing_agreement: {
    key: "data_processing_agreement", label: "Data Processing Agreement (DPA)", category: "Contracts",
    description: "GDPR Article 28 data processing terms (draft).",
    build: (ctx) => `${header(ctx, "Data Processing Agreement")}

## Controller
${v(ctx.legalName, v(ctx.companyName))} — ${v(ctx.address)}, ${v(ctx.country)}.

## Processor
OPSQAI, acting as Processor for the Personal Data described in Annex I.

## Subject Matter and Duration
Provision of the OPSQAI knowledge-intelligence platform under the ${v(ctx.subscriptionPlan)} subscription for the duration of the Service Agreement.

## Nature and Purpose of Processing
Operating the OPSQAI platform on behalf of the Controller, including storage, semantic indexing and AI-based retrieval of Controller-supplied content.

## Categories of Data Subjects and Personal Data
- Controller employees with platform accounts
- Limited authentication metadata (name, email, role, language preference)
- Content uploaded by the Controller into the knowledge base

## Sub-processors
Disclosed in the OPSQAI Trust Center. Material changes are communicated in advance.

## Security Measures
- TLS 1.2+ in transit, encryption at rest
- Row-Level Security workspace isolation
- Audit logging on sensitive actions
- Daily managed backups with point-in-time recovery

## Notice
> This document is a draft template. Final legal clauses must be reviewed and approved by qualified legal counsel.
`,
  },
  statement_of_work: {
    key: "statement_of_work", label: "Statement of Work (SOW)", category: "Contracts",
    description: "Project-scoped SOW for implementation.",
    build: (ctx) => `${header(ctx, "Statement of Work")}

## 1. Scope
Implementation of OPSQAI (${v(ctx.subscriptionPlan)}) for ${v(ctx.companyName)} across ${v(ctx.warehouses, "agreed")} sites.

## 2. Deliverables
- Configured tenant for ${v(ctx.companyName)} with RBAC
- Seeded knowledge base with priority SOPs
- Trained administrator team
- Documented operational handover

## 3. Roles and Responsibilities
| Party | Responsibility |
| --- | --- |
| ${v(ctx.companyName)} | Provide content, SMEs, executive sponsor |
| OPSQAI | Tenant setup, training, hypercare |

## 4. Acceptance Criteria
Documented in the Implementation Plan; each phase exits on signed acceptance from ${v(ctx.primaryContact, "the customer sponsor")}.

## 5. Timeline and Milestones
See Project Timeline.

## 6. Assumptions and Out of Scope
- Standard content formats supported (PDF, DOCX, HTML, MD)
- Custom integrations require a separate SOW
`,
  },
  project_charter: {
    key: "project_charter", label: "Project Charter", category: "Contracts",
    description: "Formal project authorization document.",
    build: (ctx) => `${header(ctx, "Project Charter")}

## Project Name
OPSQAI deployment at ${v(ctx.companyName)}

## Sponsor and Governance
- **Executive sponsor:** ${v(ctx.primaryContact, "[to be confirmed]")}
- **OPSQAI account manager:** ${v(ctx.accountManager, "[to be confirmed]")}
- **Steering cadence:** monthly during implementation, quarterly afterwards

## Objectives
- Deploy OPSQAI across ${v(ctx.warehouses, "agreed")} sites
- Onboard ${v(ctx.purchasedLicenses, v(ctx.seats))} licensed users
- Establish governance for knowledge updates and gap resolution

## Constraints
- Compliance with ${v(ctx.countries, v(ctx.country, "applicable"))} regulation
- Defined timeline as per the Project Timeline document

## Risks
- Late content availability
- Insufficient SME engagement
- Change-management resistance
`,
  },
  sla: {
    key: "sla", label: "Service Level Agreement", category: "Contracts",
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
| Support contacts | ${v(ctx.supportContacts, v(ctx.supportContact))} |

Final SLA terms are agreed in writing as part of the Service Agreement.
`,
  },

  // ---------------- IMPLEMENTATION ----------------
  implementation_plan: {
    key: "implementation_plan", label: "Implementation Plan", category: "Implementation",
    description: "Phased rollout with milestones.",
    build: (ctx) => `${header(ctx, "Implementation Plan")}

## Phases
1. **Discovery & Setup** — Tenant provisioning, RBAC, brand kit
2. **Content Onboarding** — Priority SOPs ingested with structured metadata
3. **Pilot** — ${v(ctx.pilot, "Time-boxed pilot in one site")}
4. **Rollout** — ${v(ctx.production, "Phased rollout across remaining sites")}
5. **Go-Live** — ${v(ctx.goLive, "All target users active")}
6. **Hypercare** — ${v(ctx.hypercare, "30 days of intensive support")}

## Status
- Onboarding: ${v(ctx.onboardingStatus)} (${v(ctx.onboardingPct, "0")}%)
- Training: ${v(ctx.trainingStatus)}

## Implementation Notes
${v(ctx.implementationNotes, "—")}
`,
  },
  deployment_roadmap: {
    key: "deployment_roadmap", label: "Deployment Roadmap", category: "Implementation",
    description: "Quarter-by-quarter roadmap.",
    build: (ctx) => `${header(ctx, "Deployment Roadmap")}

| Quarter | Milestone |
| --- | --- |
| Q1 | Tenant setup, priority content, pilot site |
| Q2 | Pilot review, rollout to additional sites |
| Q3 | Full coverage of ${v(ctx.warehouses, "all sites")}, Academy launch |
| Q4 | QBR, expansion planning, renewal preparation |
`,
  },
  deployment_guide: {
    key: "deployment_guide", label: "Deployment Guide", category: "Implementation",
    description: "Deployment and rollout guide.",
    build: (ctx) => `${header(ctx, "Deployment Guide")}

## Steps
1. Configure tenant for ${v(ctx.companyName)}
2. Set up RBAC and departments
3. Onboard administrators and content owners
4. Ingest priority knowledge content
5. Enable end-user access in phases
6. Monitor adoption and gaps; iterate
`,
  },
  project_timeline: {
    key: "project_timeline", label: "Project Timeline", category: "Implementation",
    description: "Concrete dated timeline for the engagement.",
    build: (ctx) => `${header(ctx, "Project Timeline")}

| Phase | Start | End | Owner |
| --- | --- | --- | --- |
| Kickoff | ${v(ctx.contractStartDate)} | + 1 week | OPSQAI + ${v(ctx.primaryContact, "customer sponsor")} |
| Setup | + 1 week | + 2 weeks | OPSQAI |
| Content onboarding | + 2 weeks | + 4 weeks | ${v(ctx.companyName)} SMEs |
| Pilot | + 4 weeks | + 8 weeks | Joint |
| Rollout | + 8 weeks | + 14 weeks | Joint |
| Hypercare | + 14 weeks | + 18 weeks | OPSQAI |
| Steady state | + 18 weeks | renewal (${v(ctx.renewalDate)}) | Joint |
`,
  },
  customer_welcome_guide: {
    key: "customer_welcome_guide", label: "Customer Welcome Guide", category: "Implementation",
    description: "Friendly welcome and orientation pack for the customer.",
    build: (ctx) => `${header(ctx, "Welcome to OPSQAI")}

Welcome aboard, ${v(ctx.companyName)} team.

## Your account at a glance
- Subscription: ${v(ctx.subscriptionPlan)}
- Licensed users: ${v(ctx.purchasedLicenses, v(ctx.seats))}
- Primary contact: ${v(ctx.primaryContact)}
- Account manager: ${v(ctx.accountManager)}

## What happens next
1. Kickoff call to align on success criteria
2. Tenant configured and brand kit applied
3. Priority SOPs and policies ingested
4. Pilot users invited
5. Phased rollout across ${v(ctx.warehouses, "your sites")}

## How to reach us
- Support: ${v(ctx.supportContact)}
- Technical: ${v(ctx.technicalContact)}
- Billing: ${v(ctx.billingContact)}
`,
  },
  onboarding_guide: {
    key: "onboarding_guide", label: "Onboarding Guide", category: "Implementation",
    description: "End-to-end onboarding workflow.",
    build: (ctx) => `${header(ctx, "Onboarding Guide")}

## Onboarding overview
Onboarding for ${v(ctx.companyName)} is currently at **${v(ctx.onboardingPct, "0")}%**.

## Steps
1. Account provisioning and SSO
2. Role assignment per department
3. Knowledge base ingestion
4. AI Assistant familiarization
5. Knowledge gap workflow training
6. Manager dashboards and analytics
`,
  },
  meeting_minutes: {
    key: "meeting_minutes", label: "Meeting Minutes", category: "Implementation",
    description: "Reusable minutes template for customer meetings.",
    build: (ctx) => `${header(ctx, "Meeting Minutes")}

**Customer:** ${v(ctx.companyName)}
**Date:** ${new Date().toISOString().slice(0, 10)}
**OPSQAI attendees:** ${v(ctx.accountManager, "—")}
**Customer attendees:** ${v(ctx.primaryContact, "—")}

## Agenda
1. Status update
2. Open items
3. Risks and decisions
4. Next steps

## Decisions
- **[to capture]**

## Action Items
| # | Owner | Due | Item |
| --- | --- | --- | --- |
| 1 | | | |
`,
  },
  customer_success_plan: {
    key: "customer_success_plan", label: "Customer Success Plan", category: "Implementation",
    description: "QBR cadence, adoption goals, escalation.",
    build: (ctx) => `${header(ctx, "Customer Success Plan")}

## Cadence
- Quarterly Business Review led by ${v(ctx.accountManager, "the OPSQAI account manager")}
- Monthly adoption checkpoint
- Hypercare window: ${v(ctx.hypercare, "first 30 days post go-live")}

## Adoption Goals
- ≥ 80% weekly active users on the licensed base
- < 5% knowledge-gap rate after 90 days
- Documented training completion across operations roles
`,
  },
  support_plan: {
    key: "support_plan", label: "Support Plan", category: "Implementation",
    description: "Support workflows, channels and contacts.",
    build: (ctx) => `${header(ctx, "Support Plan")}

- **Support hours:** ${v(ctx.supportHours)}
- **Primary support contact:** ${v(ctx.supportContact, v(ctx.primaryContact))}
- **Technical contact:** ${v(ctx.technicalContact)}
- **Escalation path:** ${v(ctx.escalationLevels)}
- **Maintenance windows:** ${v(ctx.maintenanceWindows)}
`,
  },

  // ---------------- TRAINING ----------------
  training_plan: {
    key: "training_plan", label: "Training Plan", category: "Training",
    description: "Role-based training curriculum.",
    build: (ctx) => `${header(ctx, "Training Plan")}

## Audience
${v(ctx.companyName)} workforce across operations, training and administration, delivered via OPSQAI Academy in ${v(ctx.languages, "the customer's languages")}.

## Curriculum
| Role | Module |
| --- | --- |
| Employee | OPSQAI basics, asking great questions, citations |
| Team Leader | Knowledge gaps, escalations, dashboards |
| Manager | Analytics, governance, audit log |
| Admin | RBAC, content management, integrations |
`,
  },
  employee_quick_start: {
    key: "employee_quick_start", label: "Employee Quick-Start Guide", category: "Training",
    description: "One-page quick start for end users.",
    build: (ctx) => `${header(ctx, "Employee Quick-Start Guide")}

## What is OPSQAI?
Your company's AI assistant for SOPs, policies and operational know-how.

## How to use it
1. Open the OPSQAI app
2. Ask in your own language (${v(ctx.languages, "DE / EN / RO")})
3. Read the answer and check the sources
4. If no answer is available, submit a knowledge gap

## Do
- Ask precise questions
- Trust the citations

## Don't
- Don't share confidential answers outside the company
- Don't bypass a "no source" refusal — submit a gap instead
`,
  },
  administrator_guide: {
    key: "administrator_guide", label: "Administrator Guide", category: "Training",
    description: "Day-to-day administrator operations.",
    build: (ctx) => `${header(ctx, "Administrator Guide")}

## Administrator responsibilities at ${v(ctx.companyName)}
- Manage users and roles
- Curate the knowledge base
- Resolve knowledge gaps and promote to KB
- Monitor confidence scores and analytics
- Maintain compliance posture and audit log
`,
  },

  // ---------------- SECURITY ----------------
  security_overview: {
    key: "security_overview", label: "Security Overview", category: "Security",
    description: "Security posture summary.",
    build: (ctx) => `${header(ctx, "Security Overview")}

OPSQAI is delivered with security controls suitable for enterprise operations at ${v(ctx.companyName)}:
- TLS 1.2+ in transit
- Encryption at rest
- Row-Level Security workspace isolation
- Enterprise RBAC across 7 roles
- Audit log for sensitive actions
- Daily managed backups with point-in-time recovery

Detailed controls are maintained in the OPSQAI Trust Center.
`,
  },

  // ---------------- COMPLIANCE ----------------
  compliance_overview: {
    key: "compliance_overview", label: "Compliance Overview", category: "Compliance",
    description: "All compliance areas with status.",
    build: (ctx) => `${header(ctx, "Compliance Overview")}

> **Draft — pending final legal review.** This overview reflects OPSQAI's intended data protection posture and does not yet constitute a binding agreement. Contact notify@opsqai.de for the current status before relying on it for procurement decisions.

Compliance posture for ${v(ctx.companyName)}:
- **GDPR:** by design. Application database hosted on Supabase in AWS eu-west-1 (Dublin, Ireland).
- **OPSQAI certification status:** OPSQAI itself is **not currently SOC 2 or ISO/IEC 27001 certified**. No formal certification project has been started yet.
- **Subprocessor certification:** Infrastructure subprocessor **Lovable** is independently **SOC 2 Type II** and **ISO/IEC 27001:2022** certified (confirmed August 2025). This does not eliminate OPSQAI's own responsibility as a data processor under Art. 28 GDPR.
- **International transfers:** Where personal data is processed outside the EEA (e.g., by Google or OpenAI as AI model providers), transfers are safeguarded by **Standard Contractual Clauses (Art. 46 GDPR)** or an equivalent adequacy mechanism.
- **AI model providers:** Google (Gemini) and OpenAI (embeddings, TTS, generation) — both routed through the Lovable AI Gateway. Customer content is not used to train their foundation models.
- **Audit log:** sensitive actions logged with actor and timestamp.
`,
  },
  gdpr_overview: {
    key: "gdpr_overview", label: "GDPR Overview", category: "Compliance",
    description: "GDPR-specific overview.",
    build: (ctx) => `${header(ctx, "GDPR Overview")}

> **Draft — pending final legal review.** Contact notify@opsqai.de for the current status before relying on this document for procurement decisions.

## Data Processing
- **Controller:** ${v(ctx.legalName, v(ctx.companyName))}
- **Processor:** OPSQAI
- **Application DB region:** AWS eu-west-1 (Dublin, Ireland)
- **Workspace isolation:** enforced via Row-Level Security
- **Sub-processors:** Lovable Cloud (Supabase, EU), Cloudflare (edge), Google (Gemini via Lovable AI Gateway), OpenAI (embeddings/TTS/generation via Lovable AI Gateway) — disclosed in the Trust Center
- **International transfers:** Standard Contractual Clauses (Art. 46 GDPR) for any processing outside the EEA
- **Retention on termination:** customer data deleted within 30 days after termination, unless a longer period is required by law
`,
  },
  data_protection_overview: {
    key: "data_protection_overview", label: "Data Protection Overview", category: "Compliance",
    description: "Plain-language data protection summary.",
    build: (ctx) => `${header(ctx, "Data Protection Overview")}

- ${v(ctx.companyName)} retains full ownership of its uploaded content.
- OPSQAI processes that content only to operate the platform on the Controller's behalf.
- All access is gated by role, scoped by workspace, and recorded in the audit log.
- Customers can export or delete their data at any time, subject to contractual notice periods.
`,
  },

  // ---------------- TECHNICAL ----------------
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
  architecture_overview: {
    key: "architecture_overview", label: "Architecture Overview", category: "Technical",
    description: "High-level architecture.",
    build: (ctx) => `${header(ctx, "Architecture Overview")}

Multi-tenant SaaS. Postgres with pgvector. Server-side RAG. RBAC enforced at the database layer.
Active workspaces, including ${v(ctx.companyName)}, are isolated by RLS policies.
`,
  },
  feature_matrix: {
    key: "feature_matrix", label: "Feature Matrix", category: "Technical",
    description: "Per-customer enabled features.",
    build: (ctx) => `${header(ctx, "Feature Matrix")}

The feature matrix for ${v(ctx.companyName)} is maintained inside the OPSQAI Customer Workspace Manager and reflects the entitlements of the ${v(ctx.subscriptionPlan)} plan.
`,
  },
  operational_assessment: {
    key: "operational_assessment", label: "Operational Assessment", category: "Technical",
    description: "Snapshot of customer operational maturity.",
    build: (ctx) => `${header(ctx, "Operational Assessment")}

## Customer profile
- Industry: ${v(ctx.industry)}
- Warehouse type: ${v(ctx.warehouseType)}
- Sites: ${v(ctx.warehouses)}
- Employees: ${v(ctx.employees)}
- Languages: ${v(ctx.languages)}

## Knowledge maturity (to be assessed jointly)
- SOP coverage
- Onboarding consistency
- Audit readiness
- Multilingual coverage

## Recommendations
- Prioritize ingestion of the most-asked-about SOPs
- Define an owner per knowledge area
- Establish a monthly gap review with managers
`,
  },
  ai_readiness_report: {
    key: "ai_readiness_report", label: "AI Readiness Report", category: "Technical",
    description: "Practical AI readiness assessment.",
    build: (ctx) => `${header(ctx, "AI Readiness Report")}

## Content readiness
- Existence of structured SOPs in ${v(ctx.languages, "key languages")}
- Coverage by department
- Update cadence

## Process readiness
- Defined knowledge owners
- Escalation path for knowledge gaps
- Adoption ownership

## Governance readiness
- Audit log review process
- RBAC alignment with org chart
- Compliance attestation routine

## Next Steps
Prioritize closing the largest readiness gap before broadening rollout at ${v(ctx.companyName)}.
`,
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

export const DOC_CATEGORIES: DocCategory[] = [
  "Commercial", "Contracts", "Implementation", "Training",
  "Security", "Compliance", "Technical", "Marketing",
  "Internal", "Generated", "Archive",
];

export const DOC_STATUSES = ["draft", "ready", "review", "approved", "sent", "archived"] as const;

/** Full set of templates included in "Generate Customer Package". */
export const CUSTOMER_PACKAGE_TEMPLATES: TemplateKey[] = [
  "executive_summary", "commercial_proposal", "quotation", "business_case", "roi_analysis",
  "enterprise_overview", "professional_brochure", "executive_presentation",
  "service_agreement", "data_processing_agreement", "statement_of_work", "project_charter", "sla",
  "implementation_plan", "deployment_roadmap", "project_timeline",
  "customer_welcome_guide", "onboarding_guide", "customer_success_plan", "support_plan",
  "training_plan", "employee_quick_start", "administrator_guide",
  "security_overview", "compliance_overview", "gdpr_overview", "data_protection_overview",
  "technical_proposal", "architecture_overview", "feature_matrix",
  "operational_assessment", "ai_readiness_report",
];

export function buildContextFromProfile(
  companyName: string,
  profile: {
    general?: Record<string, unknown>;
    commercial?: Record<string, unknown>;
    implementation?: Record<string, unknown>;
    ai_config?: Record<string, unknown>;
    sla?: Record<string, unknown>;
    branding?: Record<string, unknown>;
    onboarding_pct?: number;
    contract_status?: string;
    renewal_date?: string | null;
  } | null,
): CustomerContext {
  const g = (profile?.general ?? {}) as Record<string, unknown>;
  const c = (profile?.commercial ?? {}) as Record<string, unknown>;
  const i = (profile?.implementation ?? {}) as Record<string, unknown>;
  const a = (profile?.ai_config ?? {}) as Record<string, unknown>;
  const s = (profile?.sla ?? {}) as Record<string, unknown>;
  const b = (profile?.branding ?? {}) as Record<string, unknown>;
  const pick = (o: Record<string, unknown>, k: string) =>
    o[k] === undefined || o[k] === null || o[k] === "" ? undefined : String(o[k]);
  return {
    companyName,
    legalName: pick(g, "legalName"),
    logoUrl: pick(g, "logoUrl") ?? pick(b, "logoUrl"),
    industry: pick(g, "industry"),
    warehouseType: pick(g, "warehouseType"),
    website: pick(g, "website"),
    address: pick(g, "address"),
    country: pick(g, "country"),
    countries: pick(g, "countries"),
    registrationNumber: pick(g, "registrationNumber"),
    vatNumber: pick(g, "vatNumber"),
    employees: pick(g, "employees"),
    warehouses: pick(g, "warehouses"),
    users: pick(g, "users"),
    purchasedLicenses: pick(g, "purchasedLicenses") ?? pick(c, "purchasedLicenses") ?? pick(c, "seats"),
    languages: pick(g, "languages"),
    preferredLanguage: pick(g, "preferredLanguage") ?? pick(g, "language"),
    timezone: pick(g, "timezone"),

    primaryContact: pick(g, "primaryContact"),
    technicalContact: pick(g, "technicalContact"),
    billingContact: pick(g, "billingContact"),
    supportContact: pick(g, "supportContact"),
    accountManager: pick(g, "accountManager"),
    contactPerson: pick(g, "contactPerson"),
    email: pick(g, "email"),
    phone: pick(g, "phone"),

    workspaceName: pick(g, "workspaceName"),
    language: pick(g, "language"),

    subscriptionPlan: pick(c, "subscriptionPlan"),
    seats: pick(c, "seats"),
    aiCredits: pick(c, "aiCredits"),
    extraStorage: pick(c, "extraStorage"),
    billingFrequency: pick(c, "billingFrequency"),
    billingInfo: pick(c, "billingInfo"),
    discounts: pick(c, "discounts"),
    commercialNotes: pick(c, "notes") ?? pick(g, "customerNotes"),
    contractStartDate: pick(c, "contractStartDate"),
    contractStatus: profile?.contract_status,
    customerStatus: pick(g, "customerStatus"),
    renewalDate: profile?.renewal_date ?? undefined,

    pilot: pick(i, "pilot"),
    production: pick(i, "production"),
    goLive: pick(i, "goLive"),
    hypercare: pick(i, "hypercare"),
    trainingStatus: pick(i, "trainingStatus"),
    onboardingStatus: pick(i, "onboardingStatus"),
    onboardingPct: profile?.onboarding_pct,
    implementationNotes: pick(i, "notes"),
    customerNotes: pick(g, "customerNotes"),

    brandPrimaryColor: pick(b, "primaryColor"),
    brandAccentColor: pick(b, "accentColor"),

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
