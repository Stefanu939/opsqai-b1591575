// Public release-feed endpoint. Self-hosted installs (and the setup wizard)
// call this to discover the current image tag + checksum for a channel.
//
// GET /api/public/v1/license/releases?channel=stable
// -> { channel, current: { version, docker_image, checksum, release_notes_url, published_at }, public_key_pem }

import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

export const Route = createFileRoute("/api/public/v1/license/releases")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const channel = url.searchParams.get("channel") ?? "stable";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: rel } = await supabaseAdmin
          .from("license_releases")
          .select(
            "version, docker_image, package_storage_path, checksum, release_notes_url, notes_storage_path, channel, min_supported, published_at",
          )
          .eq("channel", channel)
          .eq("is_current", true)
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let signedDockerImage = rel?.docker_image ?? null;
        if (rel?.package_storage_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from("releases")
            .createSignedUrl(rel.package_storage_path, 3600);
          if (signed?.signedUrl) signedDockerImage = signed.signedUrl;
        }

        let signedReleaseNotesUrl = rel?.release_notes_url ?? null;
        if (rel?.notes_storage_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from("releases")
            .createSignedUrl(rel.notes_storage_path, 3600);
          if (signed?.signedUrl) signedReleaseNotesUrl = signed.signedUrl;
        }

        const current = rel
          ? {
              version: rel.version,
              docker_image: signedDockerImage,
              checksum: rel.checksum,
              release_notes_url: signedReleaseNotesUrl,
              channel: rel.channel,
              min_supported: rel.min_supported,
              published_at: rel.published_at,
            }
          : null;

        // Also return the current signing public key so wizard can pin it.
        const { data: key } = await supabaseAdmin
          .from("license_signing_keys")
          .select("public_key_pem, key_id, algorithm")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return json({ channel, current, public_key: key });
      },
    },
  },
});
