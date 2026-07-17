// Supabase-backed IAuthProvider for OPSQAI Cloud (opsqai.de).
//
// Thin adapter — the real work is done by the auto-generated Supabase
// clients and the existing `requireSupabaseAuth` middleware. This exists
// so business logic can depend on `IAuthProvider` without knowing the
// backing implementation. Cloud-only; NEVER imported by Self-Hosted.

import type {
  AuthenticatedContext,
  IAuthProvider,
  SignInInput,
  SignInResult,
} from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

export function createSupabaseAuthProvider(): IAuthProvider {
  return {
    capability: Capability.Authentication,
    name: "opsqai.cloud.supabase-auth",
    async signIn(_: SignInInput): Promise<SignInResult> {
      // Sign-in on Cloud runs client-side against Supabase Auth — the
      // browser client hits GoTrue directly. This method exists for API
      // parity and is only reached from server-side automation code.
      throw new Error(
        "supabase-auth: signIn is delegated to the browser Supabase client",
      );
    },
    async signOut(): Promise<void> {
      // Same story — the browser client handles sign-out and the root
      // onAuthStateChange listener invalidates the router.
    },
    async refresh(): Promise<SignInResult> {
      throw new Error(
        "supabase-auth: token refresh is handled by @supabase/supabase-js",
      );
    },
    async requestPasswordReset(): Promise<void> {
      throw new Error(
        "supabase-auth: password reset is triggered via supabase.auth.resetPasswordForEmail",
      );
    },
    async confirmPasswordReset(): Promise<void> {
      throw new Error(
        "supabase-auth: password reset is confirmed via supabase.auth.updateUser",
      );
    },
    async verifyAccessToken(token: string): Promise<AuthenticatedContext> {
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.SUPABASE_URL;
      const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !anon) throw new Error("Supabase env missing");
      const c = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      });
      const { data, error } = await c.auth.getClaims(token);
      if (error || !data?.claims?.sub) throw new Error("invalid_token");
      return {
        userId: data.claims.sub,
        email: (data.claims.email as string | undefined) ?? null,
        claims: data.claims as Record<string, unknown>,
      };
    },
  };
}
