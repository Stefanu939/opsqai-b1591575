import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "public-resources";

const ALLOWED = new Set<string>(
  ["sop-30-day-checklist", "knowledge-tco-calculator", "knowledge-audit-template"].flatMap((slug) =>
    ["en", "de", "ro"].map((lang) => `opsqai-${slug}-${lang}.pdf`),
  ),
);

/**
 * Public, no-login download endpoint for the marketing lead magnets.
 * The bucket is private; this route is the only reader and serves a fixed
 * allowlist of PDF filenames.
 */
export const Route = createFileRoute("/api/public/resources/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = params.file;
        if (!ALLOWED.has(file)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(file);
        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(await data.arrayBuffer(), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${file}"`,
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
