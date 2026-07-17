import { createFileRoute } from "@tanstack/react-router";
import { getAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/api/auth/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { refreshToken?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
        if (!refreshToken) {
          return Response.json({ error: "missing_refresh_token" }, { status: 400 });
        }
        try {
          const result = await getAuthProvider().refresh(refreshToken);
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
          const msg = e instanceof Error ? e.message : "refresh_failed";
          return Response.json({ error: msg }, { status: 401 });
        }
      },
    },
  },
});
