// Entra ID sign-in, step 2: Microsoft redirects back here with a code.
// We verify the identity, match it to an EXISTING local account (invite-only),
// and hand the browser a one-time code — never tokens in a URL.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/microsoft/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { isSelfHosted } = await import("@/lib/platform/mode");
        if (!isSelfHosted()) return new Response("Not found", { status: 404 });
        const m = await import("@/lib/microsoft/entra.server");
        const { mq } = await import("@/lib/microsoft/db.server");
        const origin = m.requestOrigin(request);
        const fail = (code: string) => Response.redirect(`${origin}/auth?sso_error=${encodeURIComponent(code)}`, 302);

        const url = new URL(request.url);
        if (url.searchParams.get("error")) return fail("cancelled");
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) return fail("invalid_request");

        const flows = await mq<{ code_verifier: string; nonce: string }>(
          `DELETE FROM public.sso_login_flows WHERE state = $1 AND expires_at > now()
           RETURNING code_verifier, nonce`,
          [state],
        );
        const flow = flows[0];
        if (!flow) return fail("expired");

        const cfg = m.getMicrosoftConfig();
        if (!cfg.ssoEnabled || !m.isMicrosoftConfigured(cfg)) return fail("not_configured");

        let identity;
        try {
          const { id_token } = await m.exchangeCode(cfg, {
            code,
            redirectUri: `${origin}/api/auth/microsoft/callback`,
            codeVerifier: flow.code_verifier,
          });
          identity = await m.verifyIdToken(cfg, id_token, flow.nonce);
        } catch (e) {
          console.error("[sso:entra]", e instanceof Error ? e.message : e);
          return fail("verification_failed");
        }

        // Prefer the stored binding (survives e-mail changes), else match by e-mail.
        const bound = await mq<{ user_id: string; email: string; disabled: boolean }>(
          `SELECT u.id AS user_id, u.email, u.disabled
             FROM public.user_external_identities x JOIN public.users u ON u.id = x.user_id
            WHERE x.provider = 'entra' AND x.tenant_id = $1 AND x.subject = $2`,
          [identity.tenantId, identity.objectId],
        );
        let user = bound[0];
        if (!user) {
          const byEmail = await mq<{ user_id: string; email: string; disabled: boolean }>(
            "SELECT id AS user_id, email, disabled FROM public.users WHERE lower(email) = $1",
            [identity.email],
          );
          user = byEmail[0];
          if (user) {
            await mq(
              `INSERT INTO public.user_external_identities (provider, tenant_id, subject, user_id)
               VALUES ('entra', $1, $2, $3) ON CONFLICT DO NOTHING`,
              [identity.tenantId, identity.objectId, user.user_id],
            );
          }
        }
        if (!user || user.disabled) {
          await mq(
            `INSERT INTO public.audit_log (actor_id, action, target, detail)
             VALUES (NULL, 'auth.signin_denied', $1, $2)`,
            [identity.email, JSON.stringify({ method: "entra", module: "auth", severity: "warning", success: false, reason: user ? "disabled" : "no_account" })],
          ).catch(() => undefined);
          return fail("no_account");
        }
        await mq(
          `UPDATE public.user_external_identities SET last_used_at = now()
            WHERE provider = 'entra' AND tenant_id = $1 AND subject = $2`,
          [identity.tenantId, identity.objectId],
        );

        const handoff = m.randomToken();
        await mq("DELETE FROM public.sso_login_handoffs WHERE expires_at < now()");
        await mq(
          `INSERT INTO public.sso_login_handoffs (code_hash, user_id, email, expires_at)
           VALUES ($1, $2, $3, now() + interval '2 minutes')`,
          [m.sha256hex(handoff), user.user_id, user.email],
        );
        return Response.redirect(`${origin}/auth/microsoft#code=${encodeURIComponent(handoff)}`, 302);
      },
    },
  },
});
