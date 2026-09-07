// POST /api/public/v1/updates/check — Self-Hosted update discovery.
//
// The Management Center is the source of truth for Windows releases. An
// installation asks here whether a newer published release exists for its
// channel; the answer carries an Ed25519-signed descriptor (same license key
// the installation already pins) plus a short-lived download URL.
//
// Public route, but never low-trust: the caller must present a valid signed
// install-license JWT whose install_id matches the installation it claims to
// be, and that installation must be known to the Management Center and not
// revoked. Failures return a generic 401 with no internal detail.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isNewerVersion, satisfiesMinVersion } from "@/lib/update-version";

const BodySchema = z.object({
  installation_id: z.string().min(8).max(200),
  signed_token: z.string().min(10).max(8000),
  current_version: z.string().min(1).max(64),
  channel: z.enum(["stable", "beta"]).default("stable"),
});

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/v1/updates/check")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "invalid_body" }, 400);
        }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) return json({ error: "invalid_payload" }, 400);
        const body = parsed.data;

        const { verifyHeartbeatInstallTokenFromDb } = await import("@/lib/license-signing.server");
        const verification = await verifyHeartbeatInstallTokenFromDb(
          body.signed_token,
          body.installation_id,
        );
        if (!verification.ok) return json({ error: "unauthorized" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [{ data: install }, { data: licenseRows }] = await Promise.all([
          supabaseAdmin
            .from("license_installs")
            .select("install_id")
            .eq("install_id", body.installation_id)
            .maybeSingle(),
          supabaseAdmin
            .from("licenses")
            .select("revoked, maintenance_expires_at")
            .eq("install_id", body.installation_id),
        ]);
        if (!install && !(licenseRows ?? []).length) return json({ error: "unauthorized" }, 401);

        // Updates are part of active maintenance. An installation keeps
        // running when maintenance lapses, it just stops receiving new
        // versions until it is renewed.
        const maintenance = (licenseRows ?? [])
          .map((r) => (r as { maintenance_expires_at?: string | null }).maintenance_expires_at)
          .filter((v): v is string => typeof v === "string" && v.length > 0)
          .sort()
          .pop();
        if (maintenance && new Date(maintenance).getTime() < Date.now()) {
          return json({ update: null, reason: "maintenance_expired" });
        }

        const { data: releases } = await supabaseAdmin
          .from("installer_releases")
          .select(
            "version, tag_name, channel, notes, min_version, package_storage_path, zip_url, zip_size_bytes, exe_sha256, exe_size_bytes, published_at, is_published",
          )
          .eq("channel", body.channel)
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(20);

        const candidate = (releases ?? [])
          .filter((r) => isNewerVersion(r.version, body.current_version))
          .filter((r) => satisfiesMinVersion(body.current_version, r.min_version ?? null))
          .sort((a, b) => (isNewerVersion(a.version, b.version) ? -1 : 1))[0];

        if (!candidate) return json({ update: null, reason: "up_to_date" });

        let url = candidate.zip_url ?? "";
        let artifact: "exe" | "zip" = /\.exe$/i.test(url) ? "exe" : "zip";
        let size = candidate.zip_size_bytes ?? null;

        if (candidate.package_storage_path) {
          const signed = await supabaseAdmin.storage
            .from("releases")
            .createSignedUrl(candidate.package_storage_path, 60 * 60);
          if (signed.data?.signedUrl) {
            url = signed.data.signedUrl;
            artifact = /\.exe$/i.test(candidate.package_storage_path) ? "exe" : "zip";
            size = candidate.exe_size_bytes ?? size;
          }
        }
        if (!url) return json({ update: null, reason: "no_artifact" });

        const now = Math.floor(Date.now() / 1000);
        const { signUpdateDescriptor } = await import("@/lib/license-signing.server");
        const { token, payload } = await signUpdateDescriptor({
          install_id: body.installation_id,
          version: candidate.version,
          channel: candidate.channel ?? body.channel,
          sha256: candidate.exe_sha256 ?? null,
          url,
          size,
          notes: candidate.notes ?? "",
          issued_at: now,
          expires_at: now + 55 * 60,
        });

        return json({
          update: {
            version: payload.version,
            channel: payload.channel,
            notes: payload.notes,
            url: payload.url,
            sha256: payload.sha256,
            size: payload.size,
            artifact,
            tag_name: candidate.tag_name ?? null,
            published_at: candidate.published_at ?? null,
            descriptor: token,
          },
        });
      },
    },
  },
});
