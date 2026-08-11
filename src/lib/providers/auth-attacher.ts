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
    try {
      const session = await getBrowserAuthProvider().getSession();
      return next({
        headers: session?.accessToken
          ? { Authorization: `Bearer ${session.accessToken}` }
          : {},
      });
    } catch {
      return next({ headers: {} });
    }
  },
);
