import { createFileRoute } from "@tanstack/react-router";
import { getAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/api/auth/signout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { refreshToken?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ ok: true });
        }
        const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
        if (!refreshToken) return Response.json({ ok: true });
        try {
          await getAuthProvider().signOut(refreshToken);
        } catch {
          /* best-effort */
        }
        return Response.json({ ok: true });
      },
    },
  },
});
