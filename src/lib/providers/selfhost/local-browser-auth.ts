// Self-Hosted browser-side IBrowserAuthProvider.
//
// Runs in the browser on installed Windows deployments. Talks to the
// local Node server via /api/auth/* routes. No Supabase, no external
// network calls. Session lives in localStorage under a dedicated key so
// it can never collide with a Cloud Supabase session (e.g. dev users
// switching hosts).

import { Capability } from "@/lib/platform";
import type {
  IBrowserAuthProvider,
  OpsqaiClaims,
  OpsqaiSession,
  OpsqaiUser,
  RequestPasswordResetOptions,
  SessionChangeEvent,
  SessionChangeListener,
  SetSessionFromUrlResult,
  SignInWithOAuthOptions,
  SignInWithSSOOptions,
  Unsubscribe,
} from "@/lib/providers/interfaces";

const STORAGE_KEY = "opsqai.session";
const BROADCAST_CHANNEL = "opsqai-auth";

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: OpsqaiUser;
}

function readStored(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.accessToken || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(session: StoredSession | null): void {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(STORAGE_KEY);
}

function toOpsqaiSession(s: StoredSession | null): OpsqaiSession | null {
  if (!s) return null;
  return {
    user: s.user,
    accessToken: s.accessToken,
    expiresAt: s.expiresAt,
    refreshToken: s.refreshToken,
  };
}

/** Decode a JWT body without verifying — verification happens server-side. */
function decodeJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const [, body] = token.split(".");
    if (!body) return null;
    const padded = body.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: OpsqaiUser;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const err = (await res.json()) as { error?: string };
      if (err?.error) msg = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg || "request_failed");
  }
  return (await res.json()) as T;
}

export function createLocalBrowserAuthProvider(): IBrowserAuthProvider {
  const listeners = new Set<SessionChangeListener>();
  let bc: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    bc = new BroadcastChannel(BROADCAST_CHANNEL);
  }

  function emit(event: SessionChangeEvent, session: OpsqaiSession | null): void {
    for (const l of listeners) {
      try {
        l(event, session);
      } catch {
        /* isolate listener errors */
      }
    }
  }

  function broadcast(event: SessionChangeEvent): void {
    bc?.postMessage({ event });
  }

  // Cross-tab: react to storage events and broadcast pings.
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY) return;
      const session = toOpsqaiSession(readStored());
      emit(session ? "SIGNED_IN" : "SIGNED_OUT", session);
    });
    bc?.addEventListener("message", (e: MessageEvent<{ event: SessionChangeEvent }>) => {
      const session = toOpsqaiSession(readStored());
      emit(e.data.event, session);
    });
  }

  async function ensureFreshSession(): Promise<StoredSession | null> {
    const stored = readStored();
    if (!stored) return null;
    // Refresh 60s before expiry.
    if (stored.expiresAt * 1000 - Date.now() > 60_000) return stored;
    try {
      const refreshed = await postJson<AuthResponse>("/api/auth/refresh", {
        refreshToken: stored.refreshToken,
      });
      const next: StoredSession = { ...refreshed };
      writeStored(next);
      emit("TOKEN_REFRESHED", toOpsqaiSession(next));
      broadcast("TOKEN_REFRESHED");
      return next;
    } catch {
      writeStored(null);
      emit("SIGNED_OUT", null);
      broadcast("SIGNED_OUT");
      return null;
    }
  }

  return {
    capability: Capability.Authentication,
    name: "opsqai.selfhost.local-browser-auth",

    async getSession(): Promise<OpsqaiSession | null> {
      const s = await ensureFreshSession();
      return toOpsqaiSession(s);
    },

    async getUser(): Promise<OpsqaiUser | null> {
      const s = await ensureFreshSession();
      return s?.user ?? null;
    },

    async getClaims(): Promise<OpsqaiClaims | null> {
      const s = await ensureFreshSession();
      if (!s) return null;
      const raw = decodeJwtClaims(s.accessToken);
      if (!raw) return null;
      const sub = typeof raw.sub === "string" ? raw.sub : s.user.id;
      const rolesRaw = raw.roles;
      const roles = Array.isArray(rolesRaw)
        ? rolesRaw.filter((r): r is string => typeof r === "string")
        : [];
      return {
        sub,
        email: typeof raw.email === "string" ? raw.email : s.user.email,
        roles,
        exp: typeof raw.exp === "number" ? raw.exp : undefined,
        sid: typeof raw.sid === "string" ? raw.sid : undefined,
        ...raw,
      };
    },

    onSessionChange(listener: SessionChangeListener): Unsubscribe {
      listeners.add(listener);
      // Fire INITIAL_SESSION so consumers get parity with Supabase.
      Promise.resolve().then(() => {
        const stored = readStored();
        listener("INITIAL_SESSION", toOpsqaiSession(stored));
      });
      return () => {
        listeners.delete(listener);
      };
    },

    async signInWithPassword({ email, password }): Promise<OpsqaiSession> {
      const res = await postJson<AuthResponse>("/api/auth/signin", { email, password });
      const stored: StoredSession = { ...res };
      writeStored(stored);
      emit("SIGNED_IN", toOpsqaiSession(stored));
      broadcast("SIGNED_IN");
      return toOpsqaiSession(stored) as OpsqaiSession;
    },

    async signInWithSSO(_: { providerId: string } & SignInWithSSOOptions): Promise<void> {
      throw new Error(
        "SSO sign-in is not available on Self-Hosted. Configure a local admin account instead.",
      );
    },

    async signInWithOAuth(): Promise<void> {
      throw new Error("OAuth sign-in is Cloud-only.");
    },

    async signOut(): Promise<void> {
      const stored = readStored();
      writeStored(null);
      if (stored?.refreshToken) {
        try {
          await postJson("/api/auth/signout", { refreshToken: stored.refreshToken });
        } catch {
          /* best-effort */
        }
      }
      emit("SIGNED_OUT", null);
      broadcast("SIGNED_OUT");
    },

    async requestPasswordReset(
      email: string,
      _options?: RequestPasswordResetOptions,
    ): Promise<void> {
      await postJson("/api/auth/password-reset-request", { email });
    },

    async updatePassword(newPassword: string): Promise<void> {
      const stored = await ensureFreshSession();
      if (!stored) throw new Error("not_signed_in");
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${stored.accessToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || res.statusText);
      }
      emit("USER_UPDATED", toOpsqaiSession(stored));
      broadcast("USER_UPDATED");
    },

    async setSessionFromUrl(): Promise<SetSessionFromUrlResult> {
      // Self-Hosted reset flow uses ?reset_token=<token> query param
      // (not a hash), consumed by the reset-password route which POSTs
      // to /api/auth/password-reset-confirm. There is no auto-set here.
      if (typeof window === "undefined") return { session: null, kind: "unknown" };
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset_token")) return { session: null, kind: "password_recovery" };
      if (params.get("invite_token")) return { session: null, kind: "invite" };
      return { session: toOpsqaiSession(readStored()), kind: "unknown" };
    },
  };
}
