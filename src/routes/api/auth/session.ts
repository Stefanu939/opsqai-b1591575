// Verifies the caller's access token and returns the associated user.
// The browser-side provider uses this as an optional revalidation path.
import { createFileRoute } from "@tanstack/react-router";
import { getAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return Response.json({ user: null }, { status: 200 });
        try {
          const ctx = await getAuthProvider().verifyAccessToken(token);
          return Response.json({
            user: { id: ctx.userId, email: ctx.email, displayName: null },
            claims: ctx.claims,
          });
        } catch {
          return Response.json({ user: null }, { status: 200 });
        }
      },
    },
  },
});
