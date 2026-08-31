import { createMiddleware } from "@tanstack/react-start";
import {
  getBrowserAuthProvider,
  hasBrowserAuthProvider,
} from "@/lib/providers/registry";
import { bootstrapBrowserProviders } from "@/lib/providers/browser-bootstrap";

/**
 * Attach the active platform session to every server-function RPC.
 *
 * This is the ONE bearer attacher registered in `src/start.ts`. It is
 * platform-aware by construction: the browser auth provider resolved from
 * the registry is the Supabase-backed one on Cloud and the local
 * (embedded PostgreSQL) one on Self-Hosted. Registering the generated
 * Cloud attacher (`@/integrations/supabase/auth-attacher`) alongside it
 * would drag the Cloud stub into every Self-Hosted server-function call,
 * which is exactly the "Cloud provider was reached inside a Self-Hosted
 * build" regression — so it must never be re-added here.
 *
 * The `.client()` phase also runs during SSR, where no browser provider is
 * registered; in that case we attach nothing and let the server-side auth
 * middleware read the request headers it already has.
 */
/**
 * Resolve the access token, tolerating a session that is still being
 * restored from storage right after a cold load / hydration. Without this
 * wait, the first server-fn RPC of a page load can go out with no
 * Authorization header and the server auth middleware rejects it with
 * "Unauthorized: No authorization header provided".
 */
async function resolveAccessToken(timeoutMs = 2000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const provider = getBrowserAuthProvider();
      const session = await provider.getSession();
      if (session?.accessToken) {
        // A stored-but-expired access token makes the server auth
        // middleware reject the RPC with "Unauthorized: invalid_token".
        // Refresh proactively when the token is expired or about to be.
        const expiresAtMs = (session.expiresAt ?? 0) * 1000;
        if (expiresAtMs && expiresAtMs - Date.now() < 30_000) {
          const refreshed = await provider.refreshSession?.();
          if (refreshed?.accessToken) return refreshed.accessToken;
          // Refresh token is gone/revoked: drop the dead session so the
          // user lands on sign-in instead of a blank 401 screen.
          try {
            await provider.signOut();
          } catch {
            /* ignore */
          }
          return null;
        }
        return session.accessToken;
      }
    } catch {
      return null;
    }
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, 120));
  }
}

export const attachPlatformAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next({ headers: {} });
    if (!hasBrowserAuthProvider()) {
      // Router bootstrap normally runs first; be resilient if a server
      // function fires before it (e.g. during early hydration).
      try {
        bootstrapBrowserProviders();
      } catch {
        return next({ headers: {} });
      }
    }
    const token = await resolveAccessToken();
    if (!token) {
      // No session at all: send the visitor to sign-in instead of letting
      // the RPC fail with a 401 that surfaces as a blank error screen.
      const path = window.location.pathname;
      if (path !== "/auth" && !path.startsWith("/auth/")) {
        window.location.assign(
          `/auth?next=${encodeURIComponent(path + window.location.search)}`,
        );
      }
      return next({ headers: {} });
    }
    return next({ headers: { Authorization: `Bearer ${token}` } });
  },
);
