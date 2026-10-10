// POST /api/public/v1/android/ci — GitHub Actions uploads the signed Android
// app (TWA). Auth: Bearer OPSQAI_CI_TOKEN. Stored in the "releases" bucket as
// android/opsqai.apk + android/latest.json (version, sha256, uploaded_at).
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

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const Route = createFileRoute("/api/public/v1/android/ci")({
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
        const bucket = supabaseAdmin.storage.from("releases");
        if (body.action === "start") {
          const { data, error } = await bucket.createSignedUploadUrl("android/opsqai.apk", { upsert: true });
          if (error || !data) return json({ error: "upload_url_failed" }, 500);
          return json({ upload_url: data.signedUrl });
        }
        const { data: listed } = await bucket.list("android", { search: "opsqai.apk" });
        if (!listed?.some((f) => f.name === "opsqai.apk")) return json({ error: "file_missing" }, 400);
        const meta = {
          version: body.version,
          sha256: body.sha256.toLowerCase(),
          uploaded_at: new Date().toISOString(),
        };
        const { error } = await bucket.upload("android/latest.json", JSON.stringify(meta), {
          upsert: true,
          contentType: "application/json",
        });
        if (error) return json({ error: "meta_failed" }, 500);
        return json({ ok: true, ...meta });
      },
    },
  },
});
