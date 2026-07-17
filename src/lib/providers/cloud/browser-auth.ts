// Cloud-only browser-side IBrowserAuthProvider.
//
// This is the ONE module in the application that is permitted to import
// `@/integrations/supabase/client`. Every other consumer (UI components,
// hooks, routes) must talk to auth exclusively through the
// `IBrowserAuthProvider` interface returned by `getBrowserAuthProvider()`.
//
// Not a `.server.ts` — this runs in the browser. On Self-Hosted builds it
// is stubbed out by the resolve.alias configured in Wave F, so
// `@supabase/supabase-js` never enters the Self-Hosted bundle.

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

// --------------------------------------------------------------------
// Mapping helpers — Supabase types stay inside this file.
// --------------------------------------------------------------------

interface SupabaseSessionLike {
  access_token: string;
  refresh_token?: string;
  expires_at?: number | null;
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> };
}

interface SupabaseUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

function toUser(u: SupabaseUserLike | null | undefined): OpsqaiUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    typeof meta.display_name === "string"
      ? (meta.display_name as string)
      : typeof meta.full_name === "string"
        ? (meta.full_name as string)
        : null;
  return { id: u.id, email: u.email ?? null, displayName, metadata: meta };
}

function toSession(s: SupabaseSessionLike | null | undefined): OpsqaiSession | null {
  if (!s) return null;
  const user = toUser(s.user);
  if (!user) return null;
  return {
    user,
    accessToken: s.access_token,
    expiresAt: s.expires_at ?? 0,
    refreshToken: s.refresh_token,
  };
}

const SUPABASE_EVENT_MAP: Record<string, SessionChangeEvent> = {
  SIGNED_IN: "SIGNED_IN",
  SIGNED_OUT: "SIGNED_OUT",
  TOKEN_REFRESHED: "TOKEN_REFRESHED",
  USER_UPDATED: "USER_UPDATED",
  INITIAL_SESSION: "INITIAL_SESSION",
  PASSWORD_RECOVERY: "PASSWORD_RECOVERY",
};

// --------------------------------------------------------------------
// Provider implementation
// --------------------------------------------------------------------

export function createSupabaseBrowserAuthProvider(): IBrowserAuthProvider {
  return {
    capability: Capability.Authentication,
    name: "opsqai.cloud.supabase-browser-auth",

    async getSession(): Promise<OpsqaiSession | null> {
      const { data } = await supabase.auth.getSession();
      return toSession(data.session as SupabaseSessionLike | null);
    },

    async getUser(): Promise<OpsqaiUser | null> {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return toUser(data.user as SupabaseUserLike | null);
    },

    async getClaims(): Promise<OpsqaiClaims | null> {
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data?.claims) return null;
      const c = data.claims as Record<string, unknown>;
      const sub = typeof c.sub === "string" ? c.sub : null;
      if (!sub) return null;
      const rolesRaw = c.user_roles ?? c.roles ?? [];
      const roles = Array.isArray(rolesRaw)
        ? rolesRaw.filter((r): r is string => typeof r === "string")
        : [];
      return {
        sub,
        email: typeof c.email === "string" ? c.email : null,
        roles,
        exp: typeof c.exp === "number" ? c.exp : undefined,
        sid: typeof c.session_id === "string" ? c.session_id : undefined,
        ...c,
      };
    },

    onSessionChange(listener: SessionChangeListener): Unsubscribe {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const mapped = SUPABASE_EVENT_MAP[event];
        if (!mapped) return;
        listener(mapped, toSession(session as SupabaseSessionLike | null));
      });
      return () => data.subscription.unsubscribe();
    },

    async signInWithPassword({ email, password }): Promise<OpsqaiSession> {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const session = toSession(data.session as SupabaseSessionLike | null);
      if (!session) throw new Error("sign_in_failed");
      return session;
    },

    async signInWithSSO({ providerId, redirectTo }: { providerId: string } & SignInWithSSOOptions) {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain: providerId,
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (error) throw error;
      return { url: data?.url };
    },

    async signInWithOAuth(
      provider: "google" | "apple",
      options?: SignInWithOAuthOptions,
    ): Promise<void> {
      // Google/Apple on Cloud MUST route through the Lovable broker (see
      // tanstack-supabase-integration knowledge). Do NOT call
      // supabase.auth.signInWithOAuth directly for these providers.
      await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: options?.redirectTo ?? window.location.origin,
      });
    },

    async signOut(): Promise<void> {
      await supabase.auth.signOut();
    },

    async requestPasswordReset(
      email: string,
      options?: RequestPasswordResetOptions,
    ): Promise<void> {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: options?.redirectTo,
      });
      if (error) throw error;
    },

    async updatePassword(newPassword: string): Promise<void> {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },

    async setSessionFromUrl(): Promise<SetSessionFromUrlResult> {
      // Supabase's browser client auto-parses the URL hash on load and
      // fires SIGNED_IN. We just probe the resulting session and infer
      // the flow kind from the hash's `type` param before it's cleared.
      let kind: SetSessionFromUrlResult["kind"] = "unknown";
      if (typeof window !== "undefined" && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const type = params.get("type");
        if (type === "recovery") kind = "password_recovery";
        else if (type === "invite") kind = "invite";
        else if (type === "signup" || type === "magiclink") kind = "sign_in";
      }
      // Give Supabase a beat to process the hash on first load.
      await new Promise((r) => setTimeout(r, 50));
      const { data } = await supabase.auth.getSession();
      return { session: toSession(data.session as SupabaseSessionLike | null), kind };
    },
  };
}
