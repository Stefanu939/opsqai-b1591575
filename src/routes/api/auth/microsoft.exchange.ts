// Entra ID sign-in, step 3: the browser trades the one-time code for a
// local OPSQAI session (same tokens as password sign-in).
import { createFileRoute } from "@tanstack/react-router";
import { getAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/api/auth/microsoft/exchange")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isSelfHosted } = await import("@/lib/platform/mode");
        if (!isSelfHosted()) return new Response("Not found", { status: 404 });
        let code = "";
        try {
          const body = (await request.json()) as { code?: unknown };
          code = typeof body.code === "string" ? body.code : "";
        } catch {
          /* fallthrough */
        }
        if (!code || code.length > 200) return Response.json({ error: "invalid_code" }, { status: 400 });
        const m = await import("@/lib/microsoft/entra.server");
        const { mq } = await import("@/lib/microsoft/db.server");
        const rows = await mq<{ email: string }>(
          `UPDATE public.sso_login_handoffs SET consumed_at = now()
            WHERE code_hash = $1 AND consumed_at IS NULL AND expires_at > now()
          RETURNING email`,
          [m.sha256hex(code)],
        );
        if (!rows[0]) return Response.json({ error: "invalid_code" }, { status: 401 });
        const provider = getAuthProvider();
        if (!provider.signInVerified) return Response.json({ error: "unsupported" }, { status: 400 });
        try {
          const r = await provider.signInVerified(rows[0].email, "entra");
          return Response.json({
            accessToken: r.accessToken,
            refreshToken: r.refreshToken,
            expiresAt: r.expiresAt,
            user: { id: r.user.userId, email: r.user.email, displayName: null },
          });
        } catch {
          return Response.json({ error: "account_not_found" }, { status: 401 });
        }
      },
    },
  },
});
