// OPSQAI v2.0 deployment mode.
//
// OPSQAI ships as two separate products from the same codebase:
//
//   * "mc"       — Management Center (hosted on opsqai.de). Runs the
//                  operator surfaces under /management/*. Never shipped
//                  to a customer.
//   * "selfhost" — Windows on-premise installer. Runs the customer
//                  operational surfaces under /app/* (single-tenant).
//
// Route gating is done by folder: /management/* is MC-only (enforced by
// the management layout's role check) and /app/* is the self-hosted
// operational surface. This module only exposes the client mode flag,
// used for banners and mode-conditional copy.

export type DeploymentMode = "mc" | "selfhost";

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
