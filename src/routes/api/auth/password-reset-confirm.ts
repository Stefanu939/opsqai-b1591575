import { createFileRoute } from "@tanstack/react-router";
import { getAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/api/auth/password-reset-confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { token?: unknown; newPassword?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const token = typeof body.token === "string" ? body.token : "";
        const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
        if (!token || newPassword.length < 8) {
          return Response.json({ error: "invalid_input" }, { status: 400 });
        }
        try {
          await getAuthProvider().confirmPasswordReset(token, newPassword);
          return Response.json({ ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "reset_failed";
          return Response.json({ error: msg }, { status: 400 });
        }
      },
    },
  },
});
