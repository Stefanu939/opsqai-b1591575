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

        // The Management Center "Releases" page is the source of truth: a
        // published row here is what every installation may download. Legacy
        // GitHub-registered rows in installer_releases are merged in, so old
        // installations keep discovering the versions they already knew.
        const [{ data: mcReleases }, { data: legacyReleases }] = await Promise.all([
          supabaseAdmin
            .from("license_releases")
            .select(
              "version, channel, min_supported, package_storage_path, docker_image, checksum, published_at",
            )
            .eq("channel", body.channel)
            .order("published_at", { ascending: false })
            .limit(20),
          supabaseAdmin
            .from("installer_releases")
            .select(
              "version, tag_name, channel, notes, min_version, package_storage_path, zip_url, zip_size_bytes, exe_sha256, exe_size_bytes, published_at, is_published",
            )
            .eq("channel", body.channel)
            .eq("is_published", true)
            .order("published_at", { ascending: false })
            .limit(20),
        ]);

        interface Candidate {
          version: string;
          channel: string;
          notes: string;
          minVersion: string | null;
          storagePath: string | null;
          directUrl: string | null;
          sha256: string | null;
          size: number | null;
          tagName: string | null;
          publishedAt: string | null;
        }

        const isHttpUrl = (v: string | null | undefined) =>
          typeof v === "string" && /^https?:\/\//i.test(v);

        const candidates: Candidate[] = [
          ...(mcReleases ?? []).map((r) => ({
            version: r.version,
            channel: r.channel ?? body.channel,
            notes: "",
            minVersion: r.min_supported ?? null,
            storagePath: r.package_storage_path ?? null,
            directUrl: isHttpUrl(r.docker_image) ? r.docker_image : null,
            sha256: r.checksum ?? null,
            size: null,
            tagName: null,
            publishedAt: r.published_at ?? null,
          })),
          ...(legacyReleases ?? []).map((r) => ({
            version: r.version,
            channel: r.channel ?? body.channel,
            notes: r.notes ?? "",
            minVersion: r.min_version ?? null,
            storagePath: r.package_storage_path ?? null,
            directUrl: isHttpUrl(r.zip_url) ? r.zip_url : null,
            sha256: r.exe_sha256 ?? null,
            size: r.exe_size_bytes ?? r.zip_size_bytes ?? null,
            tagName: r.tag_name ?? null,
            publishedAt: r.published_at ?? null,
          })),
        ].filter((r) => Boolean(r.storagePath) || Boolean(r.directUrl));

        const candidate = candidates
          .filter((r) => isNewerVersion(r.version, body.current_version))
          .filter((r) => satisfiesMinVersion(body.current_version, r.minVersion))
          .sort((a, b) => (isNewerVersion(a.version, b.version) ? -1 : 1))[0];

        if (!candidate) return json({ update: null, reason: "up_to_date" });

        let url = candidate.directUrl ?? "";
        let artifact: "exe" | "zip" = /\.exe$/i.test(url) ? "exe" : "zip";
        const size = candidate.size;

        if (candidate.storagePath) {
          const signed = await supabaseAdmin.storage
            .from("releases")
            .createSignedUrl(candidate.storagePath, 60 * 60);
          if (signed.data?.signedUrl) {
            url = signed.data.signedUrl;
            artifact = /\.exe$/i.test(candidate.storagePath) ? "exe" : "zip";
          }
        }
        if (!url) return json({ update: null, reason: "no_artifact" });

        const now = Math.floor(Date.now() / 1000);
        const { signUpdateDescriptor } = await import("@/lib/license-signing.server");
        const { token, payload } = await signUpdateDescriptor({
          install_id: body.installation_id,
          version: candidate.version,
          channel: candidate.channel,
          sha256: candidate.sha256,
          url,
          size,
          notes: candidate.notes,
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
            tag_name: candidate.tagName,
            published_at: candidate.publishedAt,
            descriptor: token,
          },
        });
      },
    },
  },
});
