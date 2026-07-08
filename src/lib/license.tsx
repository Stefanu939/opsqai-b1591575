// Client-side license/feature-gating primitives.
//
// Two deployment modes:
//   - "cloud" (default): running on Lovable Cloud / Edeka evaluation.
//     All modules are unlocked, no gating. Zero behavior change.
//   - "selfhost": running behind a customer's Docker install. The signed
//     license token is provided via VITE_OPSQAI_LICENSE_JWT at build time
//     or via a runtime bootstrap `window.__OPSQAI_LICENSE__` injected by
//     the setup wizard. We decode the payload (verification happens
//     server-side; the client uses payload only for UI gating).
//
// This file is purely additive — nothing imports it yet unless a route
// opts in via <ModuleGate> or useLicense().

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  BASIC_MODULES,
  effectiveModules,
  type ModuleKey,
} from "@/lib/license-modules";

export type DeploymentMode = "cloud" | "selfhost";

export interface LicenseState {
  mode: DeploymentMode;
  install_id: string | null;
  company_name: string | null;
  tier: "basic" | "standard" | "business" | "enterprise";
  modules: ModuleKey[];
  max_users: number | null;
  expires_at: number | null; // unix seconds
  hard_expiry: boolean;
  revoked: boolean;
  /** true when every module in the catalog is available (cloud mode). */
  unlimited: boolean;
}

const CLOUD_STATE: LicenseState = {
  mode: "cloud",
  install_id: null,
  company_name: null,
  tier: "enterprise",
  modules: [],
  max_users: null,
  expires_at: null,
  hard_expiry: false,
  revoked: false,
  unlimited: true,
};

interface RawPayload {
  install_id?: string;
  company_name?: string;
  tier?: LicenseState["tier"];
  modules?: string[];
  max_users?: number;
  issued_at?: number;
  expires_at?: number | null;
  hard_expiry?: boolean;
}

function base64UrlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") return atob(b64);
  // node fallback (SSR); harmless if unused
  return Buffer.from(b64, "base64").toString("binary");
}

function decodeTokenPayload(token: string): RawPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = decodeURIComponent(
      Array.from(base64UrlDecode(parts[1]))
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json) as RawPayload;
  } catch {
    return null;
  }
}

function resolveMode(): DeploymentMode {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_OPSQAI_MODE as string | undefined)) ||
    (typeof window !== "undefined" &&
      (window as unknown as { __OPSQAI_MODE__?: string }).__OPSQAI_MODE__);
  return raw === "selfhost" ? "selfhost" : "cloud";
}

function resolveLicenseToken(): string | null {
  const fromEnv =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.VITE_OPSQAI_LICENSE_JWT as string | undefined)
      : undefined;
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const w = window as unknown as { __OPSQAI_LICENSE__?: string };
    if (w.__OPSQAI_LICENSE__) return w.__OPSQAI_LICENSE__;
  }
  return null;
}

function buildSelfHostState(): LicenseState {
  const token = resolveLicenseToken();
  if (!token) {
    // Self-host without any license token → basic bundle only, no add-ons.
    return {
      mode: "selfhost",
      install_id: null,
      company_name: null,
      tier: "basic",
      modules: [...BASIC_MODULES],
      max_users: null,
      expires_at: null,
      hard_expiry: false,
      revoked: false,
      unlimited: false,
    };
  }
  const payload = decodeTokenPayload(token);
  if (!payload) {
    return {
      mode: "selfhost",
      install_id: null,
      company_name: null,
      tier: "basic",
      modules: [...BASIC_MODULES],
      max_users: null,
      expires_at: null,
      hard_expiry: false,
      revoked: true,
      unlimited: false,
    };
  }
  const now = Math.floor(Date.now() / 1000);
  const expired =
    typeof payload.expires_at === "number" && payload.expires_at < now;
  const revoked = expired && !!payload.hard_expiry;
  return {
    mode: "selfhost",
    install_id: payload.install_id ?? null,
    company_name: payload.company_name ?? null,
    tier: (payload.tier ?? "basic") as LicenseState["tier"],
    modules: effectiveModules(payload.modules ?? []),
    max_users: payload.max_users ?? null,
    expires_at: payload.expires_at ?? null,
    hard_expiry: !!payload.hard_expiry,
    revoked,
    unlimited: false,
  };
}

const LicenseContext = createContext<LicenseState | null>(null);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const value = useMemo<LicenseState>(() => {
    const mode = resolveMode();
    return mode === "cloud" ? CLOUD_STATE : buildSelfHostState();
  }, []);
  return (
    <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>
  );
}

export function useLicense(): LicenseState {
  return useContext(LicenseContext) ?? CLOUD_STATE;
}

export function hasModule(state: LicenseState, key: ModuleKey): boolean {
  if (state.unlimited) return true;
  if (state.revoked) return BASIC_MODULES.includes(key);
  return state.modules.includes(key);
}

export function useHasModule(key: ModuleKey): boolean {
  const state = useLicense();
  return hasModule(state, key);
}

interface ModuleGateProps {
  module: ModuleKey;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wrap a route/section that requires a specific add-on module. In Cloud
 * mode this is a pass-through. In self-hosted mode, if the module is not
 * licensed we render `fallback` (or a default "Upgrade to unlock" card).
 */
export function ModuleGate({ module, children, fallback }: ModuleGateProps) {
  const state = useLicense();
  if (hasModule(state, module)) return <>{children}</>;
  return <>{fallback ?? <ModuleLockedNotice moduleKey={module} />}</>;
}

function ModuleLockedNotice({ moduleKey }: { moduleKey: ModuleKey }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-8 text-center shadow-sm">
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Add-on required
      </div>
      <h2 className="text-xl font-semibold">This module is not licensed</h2>
      <p className="text-sm text-muted-foreground">
        The <code className="rounded bg-muted px-1.5 py-0.5">{moduleKey}</code>{" "}
        module is not included in your current OPSQAI license. Contact your
        OPSQAI representative to activate it for this install.
      </p>
    </div>
  );
}
