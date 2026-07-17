// Self-Hosted: update the signed-in user's password. Verifies the
// access token first, then delegates to the user repository.
import { createFileRoute } from "@tanstack/react-router";
import { getAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/api/auth/update-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return Response.json({ error: "unauthenticated" }, { status: 401 });

        let body: { newPassword?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
        if (newPassword.length < 8) {
          return Response.json({ error: "weak_password" }, { status: 400 });
        }

        let userId: string;
        try {
          const ctx = await getAuthProvider().verifyAccessToken(token);
          userId = ctx.userId;
        } catch {
          return Response.json({ error: "invalid_token" }, { status: 401 });
        }

        // The user repository's setPassword lives on the Self-Hosted
        // Pg repo; on Cloud this endpoint is never called (Cloud uses
        // supabase.auth.updateUser directly through the browser client).
        const { getUserRepository } = await import("@/lib/providers/registry");
        const repo = getUserRepository() as unknown as {
          setPassword?: (id: string, pw: string) => Promise<void>;
        };
        if (typeof repo.setPassword !== "function") {
          return Response.json({ error: "not_supported" }, { status: 501 });
        }
        try {
          await repo.setPassword(userId, newPassword);
          return Response.json({ ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "update_failed";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
