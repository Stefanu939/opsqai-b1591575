// POST /api/public/v1/releases/ci — GitHub Actions hands a freshly built
// Windows installer straight to the Management Center.
//
// Auth: `Authorization: Bearer <OPSQAI_CI_TOKEN>` (shared secret stored in the
// backend and in GitHub repository secrets). Anything else → generic 401.
//
// Two steps, so the large .exe never passes through this server:
//   1. { action: "start", version }            → signed upload URL (storage)
//   2. { action: "finish", version, sha256 }    → release row on channel
//      "canary". Canary is never offered to customers; an admin must press
//      "Promote to stable" in Management Center → Releases (human approval).

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), version: z.string().regex(/^\d+\.\d+\.\d+$/) }),
  z.object({
    action: z.literal("finish"),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  }),
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/v1/releases/ci")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env["OPSQAI_MODE"] === "selfhost") return new Response("Not found", { status: 404 });
        const expected = process.env.OPSQAI_CI_TOKEN;
        const got = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        if (!expected || expected.length < 24 || !safeEqual(got, expected)) {
          return json({ error: "unauthorized" }, 401);
        }
        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return json({ error: "bad_request" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const path = `ci/${body.version}/OPSQAI-Setup.exe`;

        if (body.action === "start") {
          const { data, error } = await supabaseAdmin.storage
            .from("releases")
            .createSignedUploadUrl(path, { upsert: true });
          if (error || !data) {
            console.error("[releases/ci] signed upload", error);
            return json({ error: "upload_url_failed" }, 500);
          }
          return json({ path, upload_url: data.signedUrl });
        }

        // finish: the file must really be there.
        const { data: listed } = await supabaseAdmin.storage
          .from("releases")
          .list(`ci/${body.version}`, { search: "OPSQAI-Setup.exe" });
        if (!listed?.some((f) => f.name === "OPSQAI-Setup.exe")) {
          return json({ error: "file_missing" }, 400);
        }

        const checksum = `sha256:${body.sha256.toLowerCase()}`;
        const { data: existing } = await supabaseAdmin
          .from("license_releases")
          .select("id, channel")
          .eq("version", body.version)
          .maybeSingle();

        if (existing) {
          if (existing.channel !== "canary") {
            return json({ error: "version_already_promoted" }, 409);
          }
          await supabaseAdmin
            .from("license_releases")
            .update({ package_storage_path: path, docker_image: `releases/${path}`, checksum })
            .eq("id", existing.id);
          return json({ ok: true, id: existing.id, channel: "canary" });
        }

        const { data: row, error } = await supabaseAdmin
          .from("license_releases")
          .insert({
            version: body.version,
            channel: "canary",
            docker_image: `releases/${path}`,
            package_storage_path: path,
            checksum,
            is_current: false,
          })
          .select("id")
          .single();
        if (error) {
          console.error("[releases/ci] insert", error);
          return json({ error: "insert_failed" }, 500);
        }
        return json({ ok: true, id: row.id, channel: "canary" });
      },
    },
  },
});
