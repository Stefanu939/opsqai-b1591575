// Public heartbeat endpoint called by self-hosted OPSQAI installs.
// Body: { install_id, app_version?, user_count?, host_info? }
// Response: { revoked, latest_token, latest_version }
//
// This endpoint is intentionally low-trust: it identifies the caller by
// `install_id` only. The License Server never returns secrets; it returns
// the same signed license token the client already has (so a fresh install
// after a wipe can recover), plus the latest published release.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  install_id: z.string().min(3).max(64),
  app_version: z.string().max(32).optional(),
  installer_version: z.string().max(32).optional(),
  user_count: z.number().int().min(0).max(1_000_000).optional(),
  host_info: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

export const Route = createFileRoute("/api/public/v1/license/heartbeat")({
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
        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch (e) {
          return json({ error: "invalid_body", detail: (e as Error).message }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: lic } = await supabaseAdmin
          .from("licenses")
          .select(
            "install_id, signed_token, revoked, revoked_reason, expires_at, maintenance_expires_at",
          )
          .eq("install_id", parsed.install_id)
          .maybeSingle();

        if (!lic) return json({ error: "unknown_install" }, 404);

        // Upsert heartbeat
        const ipHeader = request.headers.get("x-forwarded-for") ?? "";
        await supabaseAdmin.from("license_installs").upsert(
          {
            install_id: parsed.install_id,
            last_heartbeat_at: new Date().toISOString(),
            app_version: parsed.app_version ?? null,
            installer_version: parsed.installer_version ?? null,
            user_count: parsed.user_count ?? null,
            host_info: parsed.host_info ?? null,
            ip_address: ipHeader.split(",")[0].trim() || null,
          },
          { onConflict: "install_id" },
        );

        // Latest published release
        const { data: rel } = await supabaseAdmin
          .from("license_releases")
          .select("version, docker_image, checksum, release_notes_url, channel, published_at")
          .eq("is_current", true)
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return json({
          ok: true,
          revoked: lic.revoked,
          revoked_reason: lic.revoked_reason,
          expires_at: lic.expires_at,
          maintenance_expires_at: lic.maintenance_expires_at,
          latest_token: lic.revoked ? null : lic.signed_token,
          latest_release: rel ?? null,
        });
      },
    },
  },
});
