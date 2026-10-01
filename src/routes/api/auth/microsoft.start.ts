// Entra ID sign-in, step 1: redirect the browser to Microsoft.
// Self-Hosted platform only — the public website and Management Center never
// offer Microsoft sign-in.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/microsoft/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { isSelfHosted } = await import("@/lib/platform/mode");
        if (!isSelfHosted()) return new Response("Not found", { status: 404 });
        const m = await import("@/lib/microsoft/entra.server");
        const cfg = m.getMicrosoftConfig();
        if (!cfg.ssoEnabled || !m.isMicrosoftConfigured(cfg)) {
          return Response.redirect(`${m.requestOrigin(request)}/auth?sso_error=not_configured`, 302);
        }
        const { mq } = await import("@/lib/microsoft/db.server");
        const state = m.randomToken();
        const nonce = m.randomToken();
        const codeVerifier = m.randomToken();
        const url = new URL(request.url);
        const loginHint = url.searchParams.get("login_hint")?.slice(0, 200) || undefined;
        await mq("DELETE FROM public.sso_login_flows WHERE expires_at < now()");
        await mq(
          `INSERT INTO public.sso_login_flows (state, code_verifier, nonce, expires_at)
           VALUES ($1, $2, $3, now() + interval '10 minutes')`,
          [state, codeVerifier, nonce],
        );
        const redirectUri = `${m.requestOrigin(request)}/api/auth/microsoft/callback`;
        return Response.redirect(
          m.buildAuthorizeUrl(cfg, { redirectUri, state, nonce, codeVerifier, loginHint }),
          302,
        );
      },
    },
  },
});
