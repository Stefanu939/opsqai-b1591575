// ─── OPSQAI Product Architecture — canonical model ────────────────────────
//
// SINGLE SOURCE OF TRUTH for what OPSQAI is made of:
//
//   OPSQAI CORE
//     -> COMPANY PROFILE (business type)
//     -> OPSQAI PRODUCTS (explicit entitlements)
//     -> OPTIONAL ADD-ONS (the only commercial capabilities)
//     -> VISIBLE WORKSPACES / FEATURES
//
// Terminology (never reintroduce "Basic" as a commercial classification):
//   CORE        platform functionality always part of OPSQAI. Never
//               purchasable, never a Management Center activation toggle,
//               never priced. May still be RBAC-restricted.
//   PRODUCT     a domain workspace (Logistics, Transport, HR, Finance,
//               Inventory, ...). Always an explicit entitlement — a company
//               profile only makes a product recommended/available.
//   CAPABILITY  a functional capability contributed by Core or a Product.
//   ENTITLEMENT a product or capability granted to a customer by license.
//   ADD-ON      a genuinely optional commercial capability.
//
// Phase 1 scope: model + compatibility mapping only. `license-modules.ts`,
// `feature-catalog.ts` and `subscription-plans.ts` derive from this file;
// enforcement/navigation behaviour is unchanged until later phases.

export const PRODUCT_ARCHITECTURE_VERSION = "2026.09.1" as const;

// ─── Classification ───────────────────────────────────────────────────────

export type Classification = "core" | "product" | "addon";

export type CoreCapabilityKey =
  // Explicitly declared Core platform capabilities.
  | "rbac"
  | "compliance_center"
  | "enterprise_export"
  | "sop_versioning"
  | "internal_requests"
  | "reports"
  | "support_center"
  | "multi_language"
  | "workspace_health"
  | "internal_chat"
  // Fundamental platform capabilities.
  | "chat"
  | "kb"
  | "faq"
  | "academy"
  | "audit_log"
  | "knowledge_gaps"
  | "notifications"
  | "pwa"
  | "bilingual_ui";

export type ProductKey =
  | "opsqai_logistics"
  | "opsqai_transport"
  | "opsqai_hr"
  | "opsqai_finance"
  | "opsqai_inventory"
  | "opsqai_operations";

export type AddonKey =
  | "analytics"
  | "executive_dashboard"
  | "brand_center"
  | "ai_sop_generator"
  | "ai_workspace_audit";

export type CapabilityKey = CoreCapabilityKey | AddonKey;

export type CompanyProfileKey =
  | "logistics"
  | "transport"
  | "hr"
  | "finance"
  | "inventory"
  | "small_business"
  | "retail"
  | "manufacturing"
  | "enterprise_operations";

// ─── Core ─────────────────────────────────────────────────────────────────

export interface CoreCapability {
  key: CoreCapabilityKey;
  label: string;
  description: string;
  /** Grouping for UI only — carries no commercial meaning. */
  area: "AI" | "Knowledge" | "Governance" | "Operations" | "Experience";
}

export const CORE_CAPABILITIES: readonly CoreCapability[] = [
  {
    key: "chat",
    label: "AI Chat",
    description: "Grounded AI chat with source citations.",
    area: "AI",
  },
  {
    key: "kb",
    label: "Knowledge Base",
    description: "Document ingestion, semantic search, SOPs.",
    area: "Knowledge",
  },
  { key: "faq", label: "FAQ", description: "Curated FAQ answers.", area: "Knowledge" },
  {
    key: "academy",
    label: "Academy",
    description: "Learning paths, courses, certificates, quizzes.",
    area: "Knowledge",
  },
  {
    key: "audit_log",
    label: "AI Audit",
    description: "Signed, hash-chained log of every AI interaction with sources.",
    area: "Governance",
  },
  {
    key: "knowledge_gaps",
    label: "Knowledge Gaps",
    description: "Detect gaps, assign owners, promote to SOP.",
    area: "Knowledge",
  },
  {
    key: "sop_versioning",
    label: "SOP Versioning",
    description: "Full SOP history + acknowledgements.",
    area: "Knowledge",
  },
  {
    key: "internal_requests",
    label: "Internal Requests",
    description: "Ask-a-manager request flow.",
    area: "Operations",
  },
  {
    key: "internal_chat",
    label: "Internal Chat",
    description: "Employee-to-employee chat with attachments and emoji.",
    area: "Operations",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Operational reports and exports.",
    area: "Operations",
  },
  {
    key: "support_center",
    label: "Support Center",
    description: "Built-in support requests and routing.",
    area: "Operations",
  },
  {
    key: "workspace_health",
    label: "Workspace Health",
    description: "Continuous workspace-quality checks.",
    area: "Operations",
  },
  {
    key: "rbac",
    label: "Enterprise RBAC",
    description: "Fine-grained roles & permissions.",
    area: "Governance",
  },
  {
    key: "compliance_center",
    label: "Compliance Center",
    description: "GDPR / ISO-oriented compliance workflows.",
    area: "Governance",
  },
  {
    key: "enterprise_export",
    label: "Enterprise Export",
    description: "Bulk export of knowledge & audit data.",
    area: "Governance",
  },
  {
    key: "multi_language",
    label: "Multi-Language",
    description: "Multi-language UI and content (EN / DE / RO).",
    area: "Experience",
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "In-app + email notifications.",
    area: "Experience",
  },
  {
    key: "pwa",
    label: "Progressive Web App",
    description: "Installable, offline-capable client.",
    area: "Experience",
  },
  {
    key: "bilingual_ui",
    label: "Bilingual UI",
    description: "Legacy alias of the multi-language UI.",
    area: "Experience",
  },
] as const;

export const CORE_CAPABILITY_KEYS: readonly CoreCapabilityKey[] = CORE_CAPABILITIES.map(
  (c) => c.key,
);

export function isCoreCapability(key: string): key is CoreCapabilityKey {
  return (CORE_CAPABILITY_KEYS as readonly string[]).includes(key);
}

export function getCoreCapability(key: string): CoreCapability | null {
  return CORE_CAPABILITIES.find((c) => c.key === key) ?? null;
}

// ─── Products ─────────────────────────────────────────────────────────────

export interface OpsqaiProduct {
  key: ProductKey;
  label: string;
  domain: string;
  description: string;
  /** Capabilities the product contributes on top of Core. */
  capabilities: readonly string[];
  /** Implemented today, or declared for a later release. */
  status: "available" | "planned";
}

export const PRODUCT_CATALOG: readonly OpsqaiProduct[] = [
  {
    key: "opsqai_logistics",
    label: "OPSQAI Logistics",
    domain: "Logistics & Warehouse",
    description:
      "Warehouse and logistics operations, operational knowledge, SOPs and logistics workflows.",
    capabilities: ["logistics_workspace", "logistics_sops", "logistics_workflows"],
    status: "available",
  },
  {
    key: "opsqai_transport",
    label: "OPSQAI Transport",
    domain: "Transport & Fleet",
    description: "Fleet operations: vehicles, drivers, maintenance and transport workflows.",
    capabilities: ["fleet_workspace", "vehicles", "drivers", "maintenance"],
    status: "planned",
  },
  {
    key: "opsqai_hr",
    label: "OPSQAI HR",
    domain: "HR",
    description: "Onboarding, internal policies, employee knowledge, training and HR workflows.",
    capabilities: ["hr_workspace", "onboarding", "policies"],
    status: "planned",
  },
  {
    key: "opsqai_finance",
    label: "OPSQAI Finance",
    domain: "Finance",
    description:
      "Financial procedures, approvals, document intelligence and finance operations.",
    capabilities: ["finance_workspace", "approvals", "document_intelligence"],
    status: "planned",
  },
  {
    key: "opsqai_inventory",
    label: "OPSQAI Inventory",
    domain: "Inventory",
    description: "Products, stock, stock movements, suppliers and low-stock workflows.",
    capabilities: ["inventory_workspace", "stock", "suppliers"],
    status: "planned",
  },
  {
    key: "opsqai_operations",
    label: "OPSQAI Operations",
    domain: "Cross-industry Operations",
    description:
      "General operational intelligence workspace for teams that do not fit a single domain: procedures, team knowledge, requests and reporting.",
    capabilities: ["operations_workspace", "operations_procedures", "operations_requests"],
    status: "available",
  },
] as const;

export const PRODUCT_KEYS: readonly ProductKey[] = PRODUCT_CATALOG.map((p) => p.key);

export function isProductKey(key: string): key is ProductKey {
  return (PRODUCT_KEYS as readonly string[]).includes(key);
}

export function getProduct(key: string): OpsqaiProduct | null {
  return PRODUCT_CATALOG.find((p) => p.key === key) ?? null;
}

// ─── Add-ons (the only commercial capabilities) ────────────────────────────

export interface OpsqaiAddon {
  key: AddonKey;
  label: string;
  description: string;
  /** Legacy one-off default price in cents, kept for existing MC pricing UI. */
  defaultPriceCents: number;
}

export const ADDON_CATALOG: readonly OpsqaiAddon[] = [
  {
    key: "analytics",
    label: "Analytics",
    description: "Usage & knowledge analytics dashboards.",
    defaultPriceCents: 150000,
  },
  {
    key: "executive_dashboard",
    label: "Executive Dashboard",
    description: "KPI dashboard for leadership.",
    defaultPriceCents: 150000,
  },
  {
    key: "brand_center",
    label: "Brand Center",
    description: "White-label logos, colors, document branding.",
    defaultPriceCents: 100000,
  },
  {
    key: "ai_sop_generator",
    label: "AI SOP Generator",
    description: "Draft SOPs from prompts + validators.",
    defaultPriceCents: 200000,
  },
  {
    key: "ai_workspace_audit",
    label: "AI Workspace Audit",
    description: "AI audits of workspace content quality.",
    defaultPriceCents: 150000,
  },
] as const;

export const ADDON_KEYS: readonly AddonKey[] = ADDON_CATALOG.map((a) => a.key);

export function isAddonKey(key: string): key is AddonKey {
  return (ADDON_KEYS as readonly string[]).includes(key);
}

export function getAddon(key: string): OpsqaiAddon | null {
  return ADDON_CATALOG.find((a) => a.key === key) ?? null;
}

/** Canonical classification of any capability/product key. */
export function classify(key: string): Classification | "unknown" {
  if (isCoreCapability(key)) return "core";
  if (isProductKey(key)) return "product";
  if (isAddonKey(key)) return "addon";
  return "unknown";
}

// ─── Company profiles ─────────────────────────────────────────────────────

export interface CompanyProfile {
  key: CompanyProfileKey;
  label: string;
  /** Products typically bought with this profile — a recommendation only. */
  recommendedProducts: readonly ProductKey[];
  /** Products OPSQAI staff may enable for this profile. */
  availableProducts: readonly ProductKey[];
}

export const COMPANY_PROFILES: readonly CompanyProfile[] = [
  {
    key: "logistics",
    label: "Logistics & Warehouse",
    recommendedProducts: ["opsqai_logistics", "opsqai_inventory"],
    availableProducts: [
      "opsqai_logistics",
      "opsqai_inventory",
      "opsqai_transport",
      "opsqai_operations",
      "opsqai_hr",
      "opsqai_finance",
    ],
  },
  {
    key: "transport",
    label: "Transport & Fleet",
    recommendedProducts: ["opsqai_transport"],
    availableProducts: [
      "opsqai_transport",
      "opsqai_logistics",
      "opsqai_operations",
      "opsqai_hr",
      "opsqai_finance",
    ],
  },
  {
    key: "hr",
    label: "HR",
    recommendedProducts: ["opsqai_hr"],
    availableProducts: ["opsqai_hr", "opsqai_operations", "opsqai_finance"],
  },
  {
    key: "finance",
    label: "Finance",
    recommendedProducts: ["opsqai_finance"],
    availableProducts: ["opsqai_finance", "opsqai_operations", "opsqai_hr"],
  },
  {
    key: "inventory",
    label: "Inventory-focused Business",
    recommendedProducts: ["opsqai_inventory"],
    availableProducts: [
      "opsqai_inventory",
      "opsqai_logistics",
      "opsqai_operations",
      "opsqai_finance",
    ],
  },
  {
    key: "manufacturing",
    label: "Manufacturing",
    recommendedProducts: ["opsqai_operations", "opsqai_inventory"],
    availableProducts: [
      "opsqai_operations",
      "opsqai_inventory",
      "opsqai_logistics",
      "opsqai_transport",
      "opsqai_hr",
      "opsqai_finance",
    ],
  },
  {
    key: "retail",
    label: "Retail",
    recommendedProducts: ["opsqai_inventory", "opsqai_operations"],
    availableProducts: [
      "opsqai_inventory",
      "opsqai_operations",
      "opsqai_logistics",
      "opsqai_hr",
      "opsqai_finance",
    ],
  },
  {
    key: "small_business",
    label: "Small Business",
    recommendedProducts: ["opsqai_operations"],
    availableProducts: [
      "opsqai_operations",
      "opsqai_inventory",
      "opsqai_hr",
      "opsqai_finance",
      "opsqai_logistics",
    ],
  },
  {
    key: "enterprise_operations",
    label: "Enterprise Operations",
    recommendedProducts: ["opsqai_operations"],
    availableProducts: [
      "opsqai_operations",
      "opsqai_logistics",
      "opsqai_transport",
      "opsqai_inventory",
      "opsqai_hr",
      "opsqai_finance",
    ],
  },
] as const;

export const DEFAULT_COMPANY_PROFILE: CompanyProfileKey = "logistics";

export function isCompanyProfileKey(key: string): key is CompanyProfileKey {
  return COMPANY_PROFILES.some((p) => p.key === key);
}

export function getCompanyProfile(key: string | null | undefined): CompanyProfile {
  return (
    COMPANY_PROFILES.find((p) => p.key === (key ?? "")) ??
    COMPANY_PROFILES.find((p) => p.key === DEFAULT_COMPANY_PROFILE)!
  );
}

/**
 * A company profile NEVER activates products. It only reports which products
 * are available; Management Center enables them explicitly and the license
 * entitlement payload carries them to the install.
 */
export function productsAvailableFor(profile: string | null | undefined): readonly ProductKey[] {
  return getCompanyProfile(profile).availableProducts;
}

export function productsRecommendedFor(profile: string | null | undefined): readonly ProductKey[] {
  return getCompanyProfile(profile).recommendedProducts;
}

// ─── Effective configuration resolver ─────────────────────────────────────

export interface EffectiveConfigInput {
  profile?: string | null;
  /** Products explicitly enabled by Management Center / license payload. */
  enabledProducts?: readonly string[] | null;
  /** Optional add-on capabilities granted by license. */
  entitlements?: readonly string[] | null;
}

export interface EffectiveConfig {
  profile: CompanyProfileKey;
  coreCapabilities: readonly CoreCapabilityKey[];
  products: readonly ProductKey[];
  productCapabilities: readonly string[];
  addons: readonly AddonKey[];
  /** Everything the install may render, before RBAC filtering. */
  capabilities: readonly string[];
}

/**
 * Resolve what a customer's OPSQAI experience contains. Core is always
 * included; products and add-ons must be explicit entitlements.
 */
export function resolveEffectiveConfig(input: EffectiveConfigInput = {}): EffectiveConfig {
  const profile = getCompanyProfile(input.profile).key;
  const products = Array.from(new Set(input.enabledProducts ?? [])).filter(isProductKey);
  const addons = Array.from(new Set(input.entitlements ?? [])).filter(isAddonKey);
  const productCapabilities = Array.from(
    new Set(products.flatMap((p) => getProduct(p)?.capabilities ?? [])),
  );
  return {
    profile,
    coreCapabilities: CORE_CAPABILITY_KEYS,
    products,
    productCapabilities,
    addons,
    capabilities: Array.from(
      new Set<string>([...CORE_CAPABILITY_KEYS, ...productCapabilities, ...addons]),
    ),
  };
}

// ─── Legacy compatibility mapping ─────────────────────────────────────────
//
// Existing signed licenses, activation bundles and `licenses.module_key`
// rows use the legacy module vocabulary. Nothing is re-issued: every legacy
// key maps onto the new model here.

export interface LegacyMapping {
  classification: Classification;
  /** Core/add-on capability key, or product key when the module became a product. */
  target: string;
}

export const LEGACY_MODULE_MAP: Record<string, LegacyMapping> = {
  chat: { classification: "core", target: "chat" },
  kb: { classification: "core", target: "kb" },
  faq: { classification: "core", target: "faq" },
  academy: { classification: "core", target: "academy" },
  audit_log: { classification: "core", target: "audit_log" },
  knowledge_gaps: { classification: "core", target: "knowledge_gaps" },
  notifications: { classification: "core", target: "notifications" },
  pwa: { classification: "core", target: "pwa" },
  bilingual_ui: { classification: "core", target: "bilingual_ui" },
  multi_language: { classification: "core", target: "multi_language" },
  rbac: { classification: "core", target: "rbac" },
  compliance_center: { classification: "core", target: "compliance_center" },
  enterprise_export: { classification: "core", target: "enterprise_export" },
  sop_versioning: { classification: "core", target: "sop_versioning" },
  internal_requests: { classification: "core", target: "internal_requests" },
  reports: { classification: "core", target: "reports" },
  support_center: { classification: "core", target: "support_center" },
  workspace_health: { classification: "core", target: "workspace_health" },
  analytics: { classification: "addon", target: "analytics" },
  executive_dashboard: { classification: "addon", target: "executive_dashboard" },
  brand_center: { classification: "addon", target: "brand_center" },
  ai_sop_generator: { classification: "addon", target: "ai_sop_generator" },
  ai_workspace_audit: { classification: "addon", target: "ai_workspace_audit" },
};

/** Legacy `feature-catalog.ts` keys that name the same thing under another id. */
export const LEGACY_FEATURE_ALIASES: Record<string, string> = {
  ai_assistant: "chat",
  source_citations: "chat",
  knowledge_base: "kb",
  confidence_scoring: "kb",
  ai_workspace: "ai_workspace_audit",
  workspace_isolation: "rbac",
  platform_admin: "rbac",
};

/** Canonical key for any legacy module/feature key. */
export function canonicalKey(key: string): string {
  const aliased = LEGACY_FEATURE_ALIASES[key] ?? key;
  return LEGACY_MODULE_MAP[aliased]?.target ?? aliased;
}

/** Classification for any legacy module/feature key. */
export function classifyLegacy(key: string): Classification | "unknown" {
  return classify(canonicalKey(key));
}

/**
 * Legacy free-of-charge module set, kept identical to the historic
 * `BASIC_MODULES` list so Phase 1 introduces no gating change. Phase 5
 * replaces its use with `CORE_CAPABILITY_KEYS`.
 *
 * @deprecated migrating to `CORE_CAPABILITY_KEYS`.
 */
export const LEGACY_INCLUDED_MODULE_KEYS: readonly string[] = [
  "chat",
  "kb",
  "faq",
  "academy",
  "audit_log",
  "notifications",
  "bilingual_ui",
  "pwa",
  "knowledge_gaps",
] as const;

// ─── Product Workspaces ───────────────────────────────────────────────────
//
// A Product is not a renamed module: it is a domain solution that contributes
// one or more PRODUCT WORKSPACES — logical areas of work inside that domain.
//
//   PRODUCT  ->  WORKSPACE  ->  capabilities  ->  (route, when implemented)
//
// Honesty rule (enforced by tests): a workspace may only be marked
// "implemented" when it points at a route that actually exists in the app.
// Everything else is "planned" — declared architecture, never rendered as
// working navigation. Core capabilities keep their Core entitlement even when
// a workspace groups them contextually; a workspace never re-classifies Core.

export type WorkspaceStatus = "implemented" | "planned";

export interface ProductWorkspace {
  /** Stable key, unique across all products. */
  key: string;
  product: ProductKey;
  label: string;
  description: string;
  /** Lucide icon name; resolved by the UI layer so this module stays UI-agnostic. */
  icon: string;
  /** Existing application route. Required when `status === "implemented"`. */
  route?: string;
  /** Capabilities this workspace surfaces (Core or product capabilities). */
  capabilities: readonly string[];
  /**
   * Core platform capabilities this workspace presents in a domain context.
   * The workspace NEVER re-classifies them: they stay Core entitlements and
   * stay RBAC-gated. It only decides which Core surfaces are contextually
   * relevant inside this domain.
   */
  coreCapabilities?: readonly CoreCapabilityKey[];
  status: WorkspaceStatus;
}

export const PRODUCT_WORKSPACES: readonly ProductWorkspace[] = [

  // ── OPSQAI Logistics ──────────────────────────────────────────────────
  {
    key: "logistics_overview",
    product: "opsqai_logistics",
    label: "Logistics Overview",
    description: "Logistics overview: activity, open items and operational signals.",
    icon: "LayoutDashboard",
    route: "/app/products/logistics/overview",
    capabilities: ["logistics_workspace"],
    coreCapabilities: ["reports", "workspace_health"],
    status: "implemented",
  },
  {
    key: "logistics_operations",
    product: "opsqai_logistics",
    label: "Operations",
    description: "Daily logistics execution knowledge and operational processes.",
    icon: "Workflow",
    route: "/app/products/logistics/operations",
    capabilities: ["logistics_workspace"],
    coreCapabilities: ["kb", "sop_versioning", "internal_requests"],
    status: "implemented",
  },
  {
    key: "logistics_sop_library",
    product: "opsqai_logistics",
    label: "SOP Library",
    description: "Logistics SOPs, versions and acknowledgements.",
    icon: "BookOpen",
    route: "/app/products/logistics/sop-library",
    capabilities: ["logistics_workspace"],
    coreCapabilities: ["kb", "sop_versioning"],
    status: "implemented",
  },
  {
    key: "logistics_requests",
    product: "opsqai_logistics",
    label: "Operational Requests",
    description: "Operational requests raised by logistics teams.",
    icon: "Inbox",
    route: "/app/products/logistics/requests",
    capabilities: ["logistics_workspace"],
    coreCapabilities: ["internal_requests", "support_center"],
    status: "implemented",
  },
  {
    key: "logistics_incidents",
    product: "opsqai_logistics",
    label: "Incidents",
    description: "Operational exceptions and incident knowledge.",
    icon: "AlertTriangle",
    route: "/app/products/logistics/incidents",
    capabilities: ["logistics_workspace"],
    coreCapabilities: ["internal_requests", "audit_log"],
    status: "implemented",
  },
  {
    key: "logistics_gaps",
    product: "opsqai_logistics",
    label: "Knowledge Gaps",
    description: "Unanswered questions and missing knowledge in this domain.",
    icon: "BrainCircuit",
    route: "/app/products/logistics/gaps",
    capabilities: ["logistics_workspace"],
    coreCapabilities: ["knowledge_gaps"],
    status: "implemented",
  },
  {
    key: "logistics_intelligence",
    product: "opsqai_logistics",
    label: "Logistics Intelligence",
    description: "Domain-aware AI answers, grounded strictly in your knowledge.",
    icon: "Sparkles",
    route: "/app/products/logistics/intelligence",
    capabilities: ["logistics_workspace"],
    coreCapabilities: ["chat", "audit_log"],
    status: "implemented",
  },

  // ── OPSQAI Transport ──────────────────────────────────────────────────
  {
    key: "transport_overview",
    product: "opsqai_transport",
    label: "Transport Overview",
    description: "Transport overview: activity, open items and operational signals.",
    icon: "LayoutDashboard",
    route: "/app/products/transport/overview",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["reports", "workspace_health"],
    status: "implemented",
  },
  {
    key: "transport_operations",
    product: "opsqai_transport",
    label: "Transport Operations",
    description: "Dispatch, delivery processes and daily transport execution.",
    icon: "Truck",
    route: "/app/products/transport/operations",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["kb", "sop_versioning", "internal_requests"],
    status: "implemented",
  },
  {
    key: "transport_procedures",
    product: "opsqai_transport",
    label: "Procedures",
    description: "Domain procedures and standard operating documents.",
    icon: "ScrollText",
    route: "/app/products/transport/procedures",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["kb", "sop_versioning"],
    status: "implemented",
  },
  {
    key: "transport_incidents",
    product: "opsqai_transport",
    label: "Incidents",
    description: "Operational exceptions and incident knowledge.",
    icon: "AlertTriangle",
    route: "/app/products/transport/incidents",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["internal_requests", "audit_log"],
    status: "implemented",
  },
  {
    key: "transport_carriers",
    product: "opsqai_transport",
    label: "Carrier Knowledge",
    description: "Carrier requirements, contacts and handling knowledge.",
    icon: "Handshake",
    route: "/app/products/transport/carriers",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["kb", "faq"],
    status: "implemented",
  },
  {
    key: "transport_requests",
    product: "opsqai_transport",
    label: "Requests",
    description: "Operational requests routed to the responsible owners.",
    icon: "Inbox",
    route: "/app/products/transport/requests",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["internal_requests", "support_center"],
    status: "implemented",
  },
  {
    key: "transport_intelligence",
    product: "opsqai_transport",
    label: "Transport Intelligence",
    description: "Domain-aware AI answers, grounded strictly in your knowledge.",
    icon: "Sparkles",
    route: "/app/products/transport/intelligence",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["chat", "audit_log"],
    status: "implemented",
  },
  {
    key: "transport_map",
    product: "opsqai_transport",
    label: "Map",
    description: "Vehicles, drivers, carriers and open incidents on one map.",
    icon: "MapPin",
    route: "/app/products/transport/map",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["reports", "workspace_health"],
    status: "implemented",
  },
  {
    key: "transport_cmr",
    product: "opsqai_transport",
    label: "CMR",
    description: "Country-aware consignment notes, editable with PDF and CSV export.",
    icon: "FileText",
    route: "/app/products/transport/cmr",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["enterprise_export", "audit_log"],
    status: "implemented",
  },
  {
    key: "transport_settings",
    product: "opsqai_transport",
    label: "Transport Settings",
    description: "Country and language pack, alert windows, map and per-user rights.",
    icon: "Settings",
    route: "/app/products/transport/settings",
    capabilities: ["fleet_workspace"],
    coreCapabilities: ["compliance_center", "multi_language"],
    status: "implemented",
  },


  // ── OPSQAI HR ──────────────────────────────────────────────────
  {
    key: "hr_overview",
    product: "opsqai_hr",
    label: "HR Overview",
    description: "HR overview: activity, open items and operational signals.",
    icon: "LayoutDashboard",
    route: "/app/products/hr/overview",
    capabilities: ["hr_workspace"],
    coreCapabilities: ["reports", "workspace_health"],
    status: "implemented",
  },
  {
    key: "hr_policies",
    product: "opsqai_hr",
    label: "Policies & Procedures",
    description: "Internal policies and HR procedures.",
    icon: "ScrollText",
    route: "/app/products/hr/policies",
    capabilities: ["hr_workspace"],
    coreCapabilities: ["kb", "sop_versioning"],
    status: "implemented",
  },
  {
    key: "hr_requests",
    product: "opsqai_hr",
    label: "Employee Requests",
    description: "Employee questions and internal HR requests.",
    icon: "Inbox",
    route: "/app/products/hr/requests",
    capabilities: ["hr_workspace"],
    coreCapabilities: ["internal_requests", "support_center"],
    status: "implemented",
  },
  {
    key: "hr_knowledge",
    product: "opsqai_hr",
    label: "HR Knowledge",
    description: "HR knowledge base in an HR context.",
    icon: "BookOpen",
    route: "/app/products/hr/knowledge",
    capabilities: ["hr_workspace"],
    coreCapabilities: ["kb", "faq"],
    status: "implemented",
  },
  {
    key: "hr_training",
    product: "opsqai_hr",
    label: "Training",
    description: "Training paths and onboarding knowledge.",
    icon: "GraduationCap",
    route: "/app/products/hr/training",
    capabilities: ["hr_workspace"],
    coreCapabilities: ["academy"],
    status: "implemented",
  },
  {
    key: "hr_compliance",
    product: "opsqai_hr",
    label: "Compliance",
    description: "HR compliance follow-up and documentation.",
    icon: "ShieldCheck",
    route: "/app/products/hr/compliance",
    capabilities: ["hr_workspace"],
    coreCapabilities: ["compliance_center", "enterprise_export"],
    status: "implemented",
  },
  {
    key: "hr_intelligence",
    product: "opsqai_hr",
    label: "HR Intelligence",
    description: "Domain-aware AI answers, grounded strictly in your knowledge.",
    icon: "Sparkles",
    route: "/app/products/hr/intelligence",
    capabilities: ["hr_workspace"],
    coreCapabilities: ["chat", "audit_log"],
    status: "implemented",
  },

  // ── OPSQAI Finance ──────────────────────────────────────────────────
  {
    key: "finance_overview",
    product: "opsqai_finance",
    label: "Finance Overview",
    description: "Finance overview: activity, open items and operational signals.",
    icon: "LayoutDashboard",
    route: "/app/products/finance/overview",
    capabilities: ["finance_workspace"],
    coreCapabilities: ["reports", "workspace_health"],
    status: "implemented",
  },
  {
    key: "finance_procedures",
    product: "opsqai_finance",
    label: "Procedures",
    description: "Domain procedures and standard operating documents.",
    icon: "ScrollText",
    route: "/app/products/finance/procedures",
    capabilities: ["finance_workspace"],
    coreCapabilities: ["kb", "sop_versioning"],
    status: "implemented",
  },
  {
    key: "finance_knowledge",
    product: "opsqai_finance",
    label: "Financial Knowledge",
    description: "Finance documents, policies and document intelligence.",
    icon: "BookOpen",
    route: "/app/products/finance/knowledge",
    capabilities: ["finance_workspace"],
    coreCapabilities: ["kb", "faq"],
    status: "implemented",
  },
  {
    key: "finance_requests",
    product: "opsqai_finance",
    label: "Requests",
    description: "Operational requests routed to the responsible owners.",
    icon: "Inbox",
    route: "/app/products/finance/requests",
    capabilities: ["finance_workspace"],
    coreCapabilities: ["internal_requests", "support_center"],
    status: "implemented",
  },
  {
    key: "finance_compliance",
    product: "opsqai_finance",
    label: "Compliance",
    description: "Financial controls and compliance follow-up.",
    icon: "ShieldCheck",
    route: "/app/products/finance/compliance",
    capabilities: ["finance_workspace"],
    coreCapabilities: ["compliance_center", "enterprise_export"],
    status: "implemented",
  },
  {
    key: "finance_reports",
    product: "opsqai_finance",
    label: "Reports",
    description: "Domain operational reporting.",
    icon: "LineChart",
    route: "/app/products/finance/reports",
    capabilities: ["finance_workspace"],
    coreCapabilities: ["reports", "enterprise_export"],
    status: "implemented",
  },
  {
    key: "finance_intelligence",
    product: "opsqai_finance",
    label: "Finance Intelligence",
    description: "Domain-aware AI answers, grounded strictly in your knowledge.",
    icon: "Sparkles",
    route: "/app/products/finance/intelligence",
    capabilities: ["finance_workspace"],
    coreCapabilities: ["chat", "audit_log"],
    status: "implemented",
  },

  // ── OPSQAI Inventory ──────────────────────────────────────────────────
  {
    key: "inventory_overview",
    product: "opsqai_inventory",
    label: "Inventory Overview",
    description: "Inventory overview: activity, open items and operational signals.",
    icon: "LayoutDashboard",
    route: "/app/products/inventory/overview",
    capabilities: ["inventory_workspace"],
    coreCapabilities: ["reports", "workspace_health"],
    status: "implemented",
  },
  {
    key: "inventory_stock_operations",
    product: "opsqai_inventory",
    label: "Stock Operations",
    description: "Counting, discrepancy and stock-handling procedures in use.",
    icon: "Boxes",
    route: "/app/products/inventory/stock-operations",
    capabilities: ["inventory_workspace"],
    coreCapabilities: ["kb", "sop_versioning", "internal_requests"],
    status: "implemented",
  },
  {
    key: "inventory_procedures",
    product: "opsqai_inventory",
    label: "Procedures",
    description: "Domain procedures and standard operating documents.",
    icon: "ScrollText",
    route: "/app/products/inventory/procedures",
    capabilities: ["inventory_workspace"],
    coreCapabilities: ["kb", "sop_versioning"],
    status: "implemented",
  },
  {
    key: "inventory_requests",
    product: "opsqai_inventory",
    label: "Inventory Requests",
    description: "Stock and inventory requests from operational teams.",
    icon: "Inbox",
    route: "/app/products/inventory/requests",
    capabilities: ["inventory_workspace"],
    coreCapabilities: ["internal_requests", "support_center"],
    status: "implemented",
  },
  {
    key: "inventory_incidents",
    product: "opsqai_inventory",
    label: "Incidents",
    description: "Operational exceptions and incident knowledge.",
    icon: "AlertTriangle",
    route: "/app/products/inventory/incidents",
    capabilities: ["inventory_workspace"],
    coreCapabilities: ["internal_requests", "audit_log"],
    status: "implemented",
  },
  {
    key: "inventory_knowledge",
    product: "opsqai_inventory",
    label: "Inventory Knowledge",
    description: "Warehouse and inventory knowledge in context.",
    icon: "BookOpen",
    route: "/app/products/inventory/knowledge",
    capabilities: ["inventory_workspace"],
    coreCapabilities: ["kb", "faq"],
    status: "implemented",
  },
  {
    key: "inventory_intelligence",
    product: "opsqai_inventory",
    label: "Inventory Intelligence",
    description: "Domain-aware AI answers, grounded strictly in your knowledge.",
    icon: "Sparkles",
    route: "/app/products/inventory/intelligence",
    capabilities: ["inventory_workspace"],
    coreCapabilities: ["chat", "audit_log"],
    status: "implemented",
  },

  // ── OPSQAI Operations ──────────────────────────────────────────────────
  {
    key: "operations_overview",
    product: "opsqai_operations",
    label: "Operations Overview",
    description: "Operations overview: activity, open items and operational signals.",
    icon: "LayoutDashboard",
    route: "/app/products/operations/overview",
    capabilities: ["operations_workspace"],
    coreCapabilities: ["reports", "workspace_health"],
    status: "implemented",
  },
  {
    key: "operations_procedures",
    product: "opsqai_operations",
    label: "Procedures",
    description: "Domain procedures and standard operating documents.",
    icon: "ScrollText",
    route: "/app/products/operations/procedures",
    capabilities: ["operations_workspace"],
    coreCapabilities: ["kb", "sop_versioning"],
    status: "implemented",
  },
  {
    key: "operations_team_knowledge",
    product: "opsqai_operations",
    label: "Team Knowledge",
    description: "Cross-team knowledge, guides and internal documentation.",
    icon: "BookOpen",
    route: "/app/products/operations/team-knowledge",
    capabilities: ["operations_workspace"],
    coreCapabilities: ["kb", "faq"],
    status: "implemented",
  },
  {
    key: "operations_requests",
    product: "opsqai_operations",
    label: "Requests",
    description: "Operational requests routed to the responsible owners.",
    icon: "Inbox",
    route: "/app/products/operations/requests",
    capabilities: ["operations_workspace"],
    coreCapabilities: ["internal_requests", "support_center"],
    status: "implemented",
  },
  {
    key: "operations_reports",
    product: "opsqai_operations",
    label: "Reports",
    description: "Domain operational reporting.",
    icon: "LineChart",
    route: "/app/products/operations/reports",
    capabilities: ["operations_workspace"],
    coreCapabilities: ["reports", "enterprise_export"],
    status: "implemented",
  },
  {
    key: "operations_gaps",
    product: "opsqai_operations",
    label: "Knowledge Gaps",
    description: "Unanswered questions and missing knowledge in this domain.",
    icon: "BrainCircuit",
    route: "/app/products/operations/gaps",
    capabilities: ["operations_workspace"],
    coreCapabilities: ["knowledge_gaps"],
    status: "implemented",
  },
  {
    key: "operations_intelligence",
    product: "opsqai_operations",
    label: "Operations Intelligence",
    description: "Domain-aware AI answers, grounded strictly in your knowledge.",
    icon: "Sparkles",
    route: "/app/products/operations/intelligence",
    capabilities: ["operations_workspace"],
    coreCapabilities: ["chat", "audit_log"],
    status: "implemented",
  },
] as const;

export function workspacesForProduct(key: string): readonly ProductWorkspace[] {
  return PRODUCT_WORKSPACES.filter((w) => w.product === key);
}

/** Workspaces that point at a route that exists today. */
export function implementedWorkspacesForProduct(key: string): readonly ProductWorkspace[] {
  return workspacesForProduct(key).filter((w) => w.status === "implemented" && !!w.route);
}

export interface ResolvedProductWorkspaces {
  product: OpsqaiProduct;
  workspaces: readonly ProductWorkspace[];
  implemented: readonly ProductWorkspace[];
}

/**
 * Workspaces the customer's effective configuration actually contains — one
 * entry per explicitly enabled product. A company profile alone resolves to
 * nothing here, exactly like `resolveEffectiveConfig`.
 */
export function resolveProductWorkspaces(
  input: EffectiveConfigInput = {},
): ResolvedProductWorkspaces[] {
  return resolveEffectiveConfig(input).products.flatMap((key) => {
    const product = getProduct(key);
    if (!product) return [];
    return [
      {
        product,
        workspaces: workspacesForProduct(key),
        implemented: implementedWorkspacesForProduct(key),
      },
    ];
  });
}

// ─── Workspace routing helpers ────────────────────────────────────────────
//
// Product workspaces live under a single real route family:
//
//   /app/products/<product-slug>/<workspace-slug>
//
// so navigation entries always point at a route that exists.

/** "opsqai_logistics" -> "logistics" */
export function productSlug(key: ProductKey): string {
  return key.replace(/^opsqai_/, "");
}

export function getProductBySlug(slug: string): OpsqaiProduct | null {
  return PRODUCT_CATALOG.find((p) => productSlug(p.key) === slug) ?? null;
}

/** Resolve a workspace from the `/app/products/$product/$workspace` params. */
export function findWorkspace(
  slug: string,
  workspaceSlug: string,
): { product: OpsqaiProduct; workspace: ProductWorkspace } | null {
  const product = getProductBySlug(slug);
  if (!product) return null;
  const route = `/app/products/${slug}/${workspaceSlug}`;
  const workspace = PRODUCT_WORKSPACES.find(
    (w) => w.product === product.key && w.route === route,
  );
  return workspace ? { product, workspace } : null;
}

/** Sibling workspaces of the same product that are rendered today. */
export function workspaceSiblings(workspace: ProductWorkspace): readonly ProductWorkspace[] {
  return implementedWorkspacesForProduct(workspace.product);
}
