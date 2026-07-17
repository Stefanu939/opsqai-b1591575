import { createFileRoute } from "@tanstack/react-router";
import { getAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/api/auth/password-reset-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { email?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ ok: true });
        }
        const email = typeof body.email === "string" ? body.email : "";
        if (!email) return Response.json({ ok: true });
        try {
          await getAuthProvider().requestPasswordReset(email);
        } catch {
          /* never leak existence */
        }
        // Always 200 — do not reveal whether the account exists.
        return Response.json({ ok: true });
      },
    },
  },
});
