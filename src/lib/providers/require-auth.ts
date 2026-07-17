// Platform-agnostic server-fn auth middleware (Wave C.1).
//
// Replaces `requireSupabaseAuth` at every feature-code call site. Verifies
// the bearer token through the registered `IAuthProvider` — no direct
// Supabase import — and populates the same `{ supabase, userId, claims }`
// context shape existing server-fn bodies already expect, so consumers
// migrate by swapping the import only.
//
// On Cloud the `supabase` property is a real user-scoped
// `SupabaseClient<Database>`. On Self-Hosted it is a throwing proxy
// (see `local-auth.server.ts::getDataContext`) — any un-migrated
// `context.supabase.from(...)` call fails loudly with a "not migrated
// yet" error until Wave C.2 moves the owning feature to a repository.
//
// This file is server-only by filename (`.server.ts`) and never imports
// `@/integrations/supabase/*` at runtime; the `SupabaseClient<Database>`
// import below is `import type` and erased at build time, so Self-Hosted
// bundles do not gain a Supabase runtime dependency.

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getAuthProvider } from "@/lib/providers/registry";

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: No authorization header provided");
    }
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }
    const token = authHeader.slice("Bearer ".length);
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    const provider = getAuthProvider();
    let ctx;
    try {
      ctx = await provider.verifyAccessToken(token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid_token";
      throw new Error(`Unauthorized: ${msg}`);
    }

    const dataClient = (await provider.getDataContext(
      token,
    )) as SupabaseClient<Database>;

    return next({
      context: {
        supabase: dataClient,
        userId: ctx.userId,
        claims: ctx.claims,
      },
    });
  },
);
