// Catalog of modules sellable as separate license add-ons.
// The "basic" bundle is always included in every license; add-on modules
// unlock additional routes/features when their key is present in
// the license `modules` array.

export type ModuleKey =
  | "chat" | "kb" | "faq" | "notifications" | "bilingual_ui" | "pwa"
  | "academy" | "analytics" | "ai_sop_generator" | "ai_workspace_audit"
  | "audit_log" | "rbac" | "compliance_center" | "brand_center"
  | "executive_dashboard" | "enterprise_export" | "sop_versioning"
  | "knowledge_gaps" | "internal_requests" | "reports" | "workspace_health"
  | "multi_language" | "support_center";

export interface LicenseModule {
  key: ModuleKey;
  label: string;
  category: "Basic" | "AI" | "Knowledge" | "Governance" | "Administration" | "Experience";
  defaultPriceCents: number; // one-off price
  inBasic: boolean;
  description: string;
}

export const BASIC_MODULES: ModuleKey[] = [
  "chat", "kb", "faq", "notifications", "bilingual_ui", "pwa",
];

export const LICENSE_MODULE_CATALOG: LicenseModule[] = [
  { key: "chat",                label: "AI Chat Assistant",     category: "Basic",          defaultPriceCents: 0,      inBasic: true,  description: "Grounded AI chat with source citations." },
  { key: "kb",                  label: "Knowledge Base",        category: "Basic",          defaultPriceCents: 0,      inBasic: true,  description: "Document ingestion, semantic search, SOPs." },
  { key: "faq",                 label: "FAQ Library",           category: "Basic",          defaultPriceCents: 0,      inBasic: true,  description: "Curated FAQ answers." },
  { key: "notifications",       label: "Notifications",         category: "Basic",          defaultPriceCents: 0,      inBasic: true,  description: "In-app + email notifications." },
  { key: "bilingual_ui",        label: "Bilingual UI (EN/DE)",  category: "Basic",          defaultPriceCents: 0,      inBasic: true,  description: "Built-in English + German UI." },
  { key: "pwa",                 label: "Progressive Web App",   category: "Basic",          defaultPriceCents: 0,      inBasic: true,  description: "Installable, offline-capable client." },

  { key: "academy",             label: "Academy (LMS)",         category: "Experience",     defaultPriceCents: 250000, inBasic: false, description: "Learning paths, courses, certificates, quizzes." },
  { key: "analytics",           label: "Analytics",             category: "Administration", defaultPriceCents: 150000, inBasic: false, description: "Usage & knowledge analytics dashboards." },
  { key: "ai_sop_generator",    label: "AI SOP Generator",      category: "AI",             defaultPriceCents: 200000, inBasic: false, description: "Draft SOPs from prompts + validators." },
  { key: "ai_workspace_audit",  label: "AI Workspace Audit",    category: "AI",             defaultPriceCents: 150000, inBasic: false, description: "AI audits of workspace content quality." },
  { key: "audit_log",           label: "Audit Log",             category: "Governance",     defaultPriceCents: 100000, inBasic: false, description: "Immutable audit trail for compliance." },
  { key: "rbac",                label: "Enterprise RBAC",       category: "Governance",     defaultPriceCents: 150000, inBasic: false, description: "Fine-grained roles & permissions." },
  { key: "compliance_center",   label: "Compliance Center",     category: "Governance",     defaultPriceCents: 250000, inBasic: false, description: "GDPR, ISO 27001, DPA workflows." },
  { key: "brand_center",        label: "Brand Center",          category: "Experience",     defaultPriceCents: 100000, inBasic: false, description: "White-label logos, colors, docs branding." },
  { key: "executive_dashboard", label: "Executive Dashboard",   category: "Administration", defaultPriceCents: 150000, inBasic: false, description: "KPI dashboard for leadership." },
  { key: "enterprise_export",   label: "Enterprise Export",     category: "Administration", defaultPriceCents: 100000, inBasic: false, description: "Bulk export of knowledge & audit data." },
  { key: "sop_versioning",      label: "SOP Versioning",        category: "Knowledge",      defaultPriceCents: 100000, inBasic: false, description: "Full SOP history + acknowledgements." },
  { key: "knowledge_gaps",      label: "Knowledge Gaps",        category: "Knowledge",      defaultPriceCents: 80000,  inBasic: false, description: "Detect gaps, assign owners, promote to SOP." },
  { key: "internal_requests",   label: "Internal Requests",     category: "Knowledge",      defaultPriceCents: 80000,  inBasic: false, description: "Ask-a-manager ticketing flow." },
  { key: "reports",             label: "Reports",               category: "Administration", defaultPriceCents: 100000, inBasic: false, description: "Scheduled PDF/XLSX reports." },
  { key: "workspace_health",    label: "Workspace Health",      category: "Administration", defaultPriceCents: 80000,  inBasic: false, description: "Continuous workspace-quality checks." },
  { key: "multi_language",      label: "Multi-language Pack",   category: "Experience",     defaultPriceCents: 150000, inBasic: false, description: "Additional UI + content languages." },
  { key: "support_center",      label: "Support Center",        category: "Administration", defaultPriceCents: 80000,  inBasic: false, description: "Built-in support ticketing." },
];

export const ADDON_MODULES = LICENSE_MODULE_CATALOG.filter((m) => !m.inBasic);

export function isValidModuleKey(k: string): k is ModuleKey {
  return LICENSE_MODULE_CATALOG.some((m) => m.key === k);
}

export function effectiveModules(licensed: string[] | null | undefined): ModuleKey[] {
  const set = new Set<string>(BASIC_MODULES);
  for (const k of licensed ?? []) if (isValidModuleKey(k)) set.add(k);
  return Array.from(set) as ModuleKey[];
}
