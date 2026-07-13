// Phase 6 / RC-blocker fix — Deployment mode & route lockdown.
//
// OPSQAI ships as two deployments from the same codebase:
//
//   * "mc"       — Management Center (hosted, opsqai.de).
//                  ONLY platform management: companies, customers, licenses,
//                  orders/subscriptions, activation bundles, releases,
//                  installations, signing keys, enterprise documents, audit,
//                  support, platform administration, customer portal.
//   * "selfhost" — Customer install (Docker / bare metal).
//                  ONLY operational modules: chat, workspace, knowledge base,
//                  FAQ, internal requests, academy, command center, SOP
//                  generator, knowledge gaps, brand center, users, SSO,
//                  integrations, webhooks, API keys, and the local platform
//                  setup / doctor / recovery / license-activation surfaces.
//
// Navigation is generated from these lists — nothing outside them ever
// shows up in the sidebar. Deep links are blocked at render time by the
// DeploymentModeGate.

export type DeploymentMode = "mc" | "selfhost";

/**
 * Routes that render in BOTH deployments (dashboard shell, profile, docs).
 */
export const SHARED_PREFIXES: readonly string[] = [
  "/app", // /app landing — dashboard root (each mode renders its own content)
  "/app/profile",
  "/app/docs",
  // Platform surfaces that exist in BOTH deployments (MC = platform-wide,
  // self-host = local install). The page content differentiates internally.
  "/app/admin/analytics",
  "/app/admin/integrations",
  "/app/admin/sso-setup",
  "/app/admin/webhooks",
  "/app/admin/api-keys",
  "/app/admin/api-docs",
  "/app/admin/users",
  "/app/brand",
  "/app/platform/setup",
  "/app/platform/doctor",
  "/app/platform/recovery",
  "/app/platform/license-activation",
];

/**
 * MC-only routes. Blocked on self-hosted.
 */
export const MC_ONLY_PREFIXES: readonly string[] = [
  "/app/admin/dashboard",
  "/app/admin/companies",
  "/app/admin/customers", // Enterprise Documents / customer registry
  "/app/admin/subscriptions", // Orders / Subscriptions
  "/app/admin/support", // Support Inbox
  "/app/admin/email",
  "/app/admin/email-logs",
  "/app/admin/platform", // Platform Administration
  "/app/admin/platform-admins", // Super Admins
  "/app/admin/audit", // Platform audit (MC-only per spec)
  "/app/platform/licenses", // Licenses, Activation Bundles, Releases, Installations, Signing Keys
  "/portal", // Customer Portal (hosted MC)
];

/**
 * Self-hosted-only routes. Blocked on MC. Only customer operational modules.
 */
export const SELFHOST_ONLY_PREFIXES: readonly string[] = [
  // Operational — workspace
  "/app/chat",
  "/app/workspace",
  "/app/knowledge",
  "/app/faq",
  "/app/requests",
  "/app/academy",
  "/app/internal",
  // Operational — admin
  "/app/admin/academy",
  "/app/admin/knowledge-gaps",
  "/app/admin/sop-generator",
  "/app/admin/command-center",
  "/app/admin/ai-audit",
  "/app/admin/notifications",
];

/**
 * Kept for backward compatibility with existing tests. Subset of
 * SELFHOST_ONLY_PREFIXES that represents customer operational data.
 */
export const OPERATIONAL_PREFIXES: readonly string[] = [
  "/app/chat",
  "/app/workspace",
  "/app/knowledge",
  "/app/faq",
  "/app/requests",
  "/app/academy",
  "/app/internal",
  "/app/admin/academy",
  "/app/admin/knowledge-gaps",
  "/app/admin/sop-generator",
  "/app/admin/command-center",
];

function anyPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export interface RouteGateVerdict {
  allowed: boolean;
  reason?: "mc_only_route_on_selfhost" | "selfhost_only_route_on_mc" | "operational_on_mc";
}

/**
 * Pure route gate. More specific prefixes win — an MC-only path on a
 * self-host install is denied; a self-host-only path on MC is denied
 * (and reported as "operational_on_mc" when it's a customer operational
 * surface, to preserve the existing UX copy).
 */
export function isRouteAllowedInMode(path: string, mode: DeploymentMode): RouteGateVerdict {
  if (mode === "selfhost" && anyPrefix(path, MC_ONLY_PREFIXES)) {
    return { allowed: false, reason: "mc_only_route_on_selfhost" };
  }
  if (mode === "mc" && anyPrefix(path, SELFHOST_ONLY_PREFIXES)) {
    const reason = anyPrefix(path, OPERATIONAL_PREFIXES)
      ? "operational_on_mc"
      : "selfhost_only_route_on_mc";
    return { allowed: false, reason };
  }
  return { allowed: true };
}

/**
 * Client-visible deployment mode.
 */
export function getClientDeploymentMode(): DeploymentMode {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __OPSQAI_MODE__?: string }).__OPSQAI_MODE__;
    if (injected === "selfhost" || injected === "mc") return injected;
  }
  const viteMode = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_OPSQAI_MODE;
  if (viteMode === "selfhost" || viteMode === "mc") return viteMode;
  return "mc";
}
