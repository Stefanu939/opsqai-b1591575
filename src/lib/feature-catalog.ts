// Catalog of every OPSQAI platform feature exposed in the Customer Manager.
// Edit per customer in the Feature Matrix tab.

export type FeatureState = "enabled" | "disabled" | "beta" | "enterprise" | "coming_soon";

export interface FeatureDef {
  key: string;
  label: string;
  category: "AI" | "Knowledge" | "Governance" | "Administration" | "Experience";
  defaultState: FeatureState;
}

export const FEATURE_CATALOG: FeatureDef[] = [
  // AI
  { key: "ai_assistant", label: "AI Assistant", category: "AI", defaultState: "enabled" },
  { key: "source_citations", label: "Source Citations", category: "AI", defaultState: "enabled" },
  { key: "ai_sop_generator", label: "AI SOP Generator", category: "AI", defaultState: "enabled" },
  {
    key: "ai_workspace_audit",
    label: "AI Workspace Audit",
    category: "AI",
    defaultState: "enabled",
  },
  { key: "ai_workspace", label: "AI Workspace", category: "AI", defaultState: "enabled" },

  // Knowledge
  {
    key: "knowledge_base",
    label: "Knowledge Base",
    category: "Knowledge",
    defaultState: "enabled",
  },
  { key: "faq", label: "FAQ", category: "Knowledge", defaultState: "enabled" },
  {
    key: "knowledge_gaps",
    label: "Knowledge Gaps",
    category: "Knowledge",
    defaultState: "enabled",
  },
  {
    key: "internal_requests",
    label: "Internal Requests",
    category: "Knowledge",
    defaultState: "enabled",
  },
  {
    key: "sop_versioning",
    label: "SOP Versioning",
    category: "Knowledge",
    defaultState: "enabled",
  },
  {
    key: "confidence_scoring",
    label: "Confidence Scoring",
    category: "Knowledge",
    defaultState: "enabled",
  },

  // Governance
  { key: "audit_log", label: "Audit Log", category: "Governance", defaultState: "enabled" },
  { key: "rbac", label: "Enterprise RBAC", category: "Governance", defaultState: "enabled" },
  {
    key: "workspace_isolation",
    label: "Workspace Isolation",
    category: "Governance",
    defaultState: "enabled",
  },
  {
    key: "compliance_center",
    label: "Compliance Center",
    category: "Governance",
    defaultState: "enterprise",
  },

  // Administration
  {
    key: "platform_admin",
    label: "Platform Administration",
    category: "Administration",
    defaultState: "enabled",
  },
  {
    key: "executive_dashboard",
    label: "Executive Dashboard",
    category: "Administration",
    defaultState: "enabled",
  },
  { key: "analytics", label: "Analytics", category: "Administration", defaultState: "enabled" },
  { key: "reports", label: "Reports", category: "Administration", defaultState: "beta" },
  {
    key: "enterprise_export",
    label: "Enterprise Export",
    category: "Administration",
    defaultState: "enabled",
  },
  {
    key: "support_center",
    label: "Support Center",
    category: "Administration",
    defaultState: "enabled",
  },
  {
    key: "workspace_health",
    label: "Workspace Health",
    category: "Administration",
    defaultState: "enabled",
  },

  // Experience
  {
    key: "brand_center",
    label: "Brand Center",
    category: "Experience",
    defaultState: "enterprise",
  },
  { key: "academy", label: "Academy", category: "Experience", defaultState: "enabled" },
  {
    key: "multi_language",
    label: "Multi-language",
    category: "Experience",
    defaultState: "enabled",
  },
  { key: "bilingual_ui", label: "Bilingual UI", category: "Experience", defaultState: "enabled" },
  { key: "pwa", label: "Progressive Web App", category: "Experience", defaultState: "enabled" },
  { key: "notifications", label: "Notifications", category: "Experience", defaultState: "enabled" },
];

// Compliance topics the OPSQAI platform touches. Note: labels here describe
// areas of coverage, not that OPSQAI itself is certified. OPSQAI is NOT
// currently SOC 2 or ISO/IEC 27001 certified — see /trust/iso-27001-roadmap.
export const COMPLIANCE_AREAS = [
  "GDPR",
  "ISO 27001 (not yet certified)",
  "ISO 9001",
  "Role-Based Access Control",
  "Workspace Isolation",
  "Encryption",
  "Backups",
  "Audit Logging",
  "Data Retention",
  "Password Policies",
  "Multi-Factor Authentication",
  "Disaster Recovery",
  "Business Continuity",
  "Data Residency",
] as const;

export const SECURITY_AREAS = [
  "Authentication",
  "Authorization",
  "Encryption",
  "Storage",
  "Infrastructure",
  "Backups",
  "Monitoring",
  "Incident Response",
  "Penetration Testing",
  "Vulnerability Management",
  "Logging",
  "Audit",
  "Network Security",
] as const;
