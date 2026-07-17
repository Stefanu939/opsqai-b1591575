// Self-Hosted local sign-in endpoint.
//
// Called by the Self-Hosted `IBrowserAuthProvider` when the user submits
// the password form. On Cloud this route is bundled but never called —
// Cloud auth talks directly to Supabase GoTrue via the browser client.

import { createFileRoute } from "@tanstack/react-router";
import { getAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/api/auth/signin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { email?: unknown; password?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const email = typeof body.email === "string" ? body.email : "";
        const password = typeof body.password === "string" ? body.password : "";
        if (!email || !password) {
          return Response.json({ error: "missing_credentials" }, { status: 400 });
        }
        try {
          const result = await getAuthProvider().signIn({ email, password });
          return Response.json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresAt: result.expiresAt,
            user: {
              id: result.user.userId,
              email: result.user.email,
              displayName: null,
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "sign_in_failed";
          const status = msg === "invalid_credentials" ? 401 : 500;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
