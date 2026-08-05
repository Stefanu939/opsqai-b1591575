import { createMiddleware } from "@tanstack/react-start";
import { getBrowserAuthProvider } from "@/lib/providers/registry";

/** Attach the active platform session to every server-function RPC. */
export const attachPlatformAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const session = await getBrowserAuthProvider().getSession();
    return next({
      headers: session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {},
    });
  },
);