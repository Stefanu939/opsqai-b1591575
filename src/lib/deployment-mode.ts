// Phase 6 — Deployment mode & access lockdown.
//
// OPSQAI ships as two deployments from the same codebase:
//
//   * "mc"       — the Management Center (this hosted app, opsqai.de).
//                  Owns licensing, customers, orders, subscription lifecycle,
//                  platform admins. MUST NOT expose operational modules.
//   * "selfhost" — the customer's own install (Docker or bare metal).
//                  Owns operational modules (knowledge base, academy, chat,
//                  faq, sops, brand, requests, workspace). MUST NOT expose
//                  MC surfaces (issuing licenses, customer registry, etc.).
//
// Both deployments still render a shared shell — routes are gated at
// runtime by matching the current path against the two allow-lists below.
//
// This module is pure (no server-only imports) so it can be used both in
// route components and in tests.

export type DeploymentMode = "mc" | "selfhost";

/**
 * Route path prefixes that are allowed ONLY when the app runs as the
 * Management Center. Matched with startsWith().
 */
export const MC_ONLY_PREFIXES: readonly string[] = [
  "/app/admin/platform",         // platform admin listing
  "/app/admin/platform-admins",  // platform-admin management
  "/app/admin/customers",        // customer registry
  "/app/admin/subscriptions",    // subscription lifecycle
  "/app/platform/licenses",      // issue / revoke licenses
  "/portal",                     // customer portal (hosted MC only)
];

/**
 * Route path prefixes that are allowed ONLY when the app runs Self-Hosted.
 * The setup wizard, doctor, recovery and license-activation UIs configure
 * a *local* install and have no meaning inside the MC.
 */
export const SELFHOST_ONLY_PREFIXES: readonly string[] = [
  "/app/platform/setup",
  "/app/platform/doctor",
  "/app/platform/recovery",
  "/app/platform/license-activation",
];

/**
 * Route path prefixes that carry customer operational data. MC deployments
 * MUST NOT expose these — they only exist inside a customer install.
 */
export const OPERATIONAL_PREFIXES: readonly string[] = [
  "/app/knowledge",
  "/app/academy",
  "/app/chat",
  "/app/faq",
  "/app/workspace",
  "/app/brand",
  "/app/requests",
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
 * Pure route gate. Given a path and the current deployment mode, decide
 * whether the route is allowed to render.
 *
 * Rules:
 *   - MC-only route + mode=selfhost  → deny
 *   - Self-host-only route + mode=mc → deny
 *   - Operational route + mode=mc    → deny
 *   - Everything else                → allow
 */
export function isRouteAllowedInMode(path: string, mode: DeploymentMode): RouteGateVerdict {
  if (mode === "selfhost" && anyPrefix(path, MC_ONLY_PREFIXES)) {
    return { allowed: false, reason: "mc_only_route_on_selfhost" };
  }
  if (mode === "mc") {
    if (anyPrefix(path, SELFHOST_ONLY_PREFIXES)) {
      return { allowed: false, reason: "selfhost_only_route_on_mc" };
    }
    if (anyPrefix(path, OPERATIONAL_PREFIXES)) {
      return { allowed: false, reason: "operational_on_mc" };
    }
  }
  return { allowed: true };
}

/**
 * Client-visible deployment mode. Reads, in order:
 *   1. `window.__OPSQAI_MODE__` (set by SSR bootstrap)
 *   2. `VITE_OPSQAI_MODE` build-time env
 *   3. Fallback: "mc" (the hosted deployment is the default runtime).
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
