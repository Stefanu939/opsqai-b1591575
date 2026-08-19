// POST /api/public/selfhost-heartbeat — self-hosted "phone home" ingestion.
//
// Phase 4: Self-hosted OPSQAI installs periodically report a small,
// non-sensitive status snapshot (org name, country, language, version,
// enabled modules, license status) so the Management Center can render
// fleet visibility. This endpoint is public but NOT low-trust: every
// caller must present a valid Ed25519-signed install-license JWT whose
// `install_id` matches the reported `installation_id`. Unverified callers
// get a generic 401 — no internal detail is ever leaked in the response.

import { createFileRoute } from "@tanstack/react-router";
import { HeartbeatPayloadSchema } from "@/lib/selfhost-heartbeat-schema";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

const GENERIC_UNAUTHORIZED = { error: "unauthorized" } as const;

export const Route = createFileRoute("/api/public/selfhost-heartbeat")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid_body" }, 400);
        }

        const parsed = HeartbeatPayloadSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "invalid_payload" }, 400);
        }
        const payload = parsed.data;

        // Verify the caller actually owns the install-license it claims to.
        const { verifyHeartbeatInstallTokenFromDb } = await import("@/lib/license-signing.server");
        const verification = await verifyHeartbeatInstallTokenFromDb(
          payload.signed_token,
          payload.installation_id,
        );
        if (!verification.ok) {
          return json(GENERIC_UNAUTHORIZED, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // The installation must be a known, provisioned install — never
        // create license rows from a heartbeat.
        const { data: install } = await supabaseAdmin
          .from("license_installs")
          .select("install_id")
          .eq("install_id", payload.installation_id)
          .maybeSingle();
        if (!install) {
          return json(GENERIC_UNAUTHORIZED, 401);
        }

        const now = new Date().toISOString();

        const { error: upsertError } = await supabaseAdmin.from("selfhost_installations").upsert(
          {
            install_id: payload.installation_id,
            organization_name: payload.organization_name ?? null,
            country: payload.country ?? null,
            primary_language: payload.primary_language ?? null,
            enabled_modules: payload.enabled_modules ?? [],
            reported_status: payload.status,
            license_status: payload.license_status ?? null,
            last_maintenance_at: payload.last_maintenance_at ?? null,
            next_maintenance_at: payload.next_maintenance_at ?? null,
            last_heartbeat_at: now,
            app_version: payload.app_version ?? null,
            updated_at: now,
          },
          { onConflict: "install_id" },
        );
        if (upsertError) {
          // Never leak DB error detail to an unauthenticated caller.
          return json({ error: "internal_error" }, 500);
        }

        await supabaseAdmin.from("selfhost_heartbeats").insert({
          install_id: payload.installation_id,
          received_at: now,
          reported_status: payload.status,
          license_status: payload.license_status ?? null,
          app_version: payload.app_version ?? null,
          organization_name: payload.organization_name ?? null,
          country: payload.country ?? null,
          primary_language: payload.primary_language ?? null,
          enabled_modules: payload.enabled_modules ?? [],
          last_maintenance_at: payload.last_maintenance_at ?? null,
          next_maintenance_at: payload.next_maintenance_at ?? null,
          client_timestamp: payload.timestamp,
        });

        return json({ ok: true });
      },
    },
  },
});
