// Public study questionnaire intake. Anonymous by design: no email, no IP stored raw.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { STUDY_BENCHMARK_MIN, STUDY_LOCALES, STUDY_QUESTIONS } from "@/i18n/pages/study";

const QUESTION_IDS = STUDY_QUESTIONS.map((q) => q.id) as [string, ...string[]];

const BodySchema = z.object({
  locale: z.enum(STUDY_LOCALES as unknown as [string, ...string[]]),
  country: z.string().trim().max(16).optional().or(z.literal("")),
  answers: z.record(z.enum(QUESTION_IDS), z.string().trim().min(1).max(64)),
  // Honeypot
  website: z.string().max(0).optional().or(z.literal("")),
});

async function ipHash(req: Request): Promise<string | null> {
  const raw =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip");
  if (!raw) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function publicBenchmark(raw: unknown): { total: number; open: boolean; byQuestion: Record<string, Record<string, number>> } {
  const data = (raw ?? {}) as { total?: number; by_question?: Record<string, Record<string, number>> };
  const total = Number(data.total ?? 0);
  const open = total >= STUDY_BENCHMARK_MIN;
  return { total, open, byQuestion: open ? (data.by_question ?? {}) : {} };
}

export const Route = createFileRoute("/api/public/study-submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let sb;
        try {
          const mod = await import("@/lib/providers/cloud/service-role.server");
          sb = mod.createServiceRoleClient();
        } catch {
          return Response.json({ error: "Service temporarily unavailable." }, { status: 503 });
        }

        let parsed: z.infer<typeof BodySchema>;
        try {
          parsed = BodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid submission." }, { status: 400 });
        }
        if ((parsed.website ?? "").length > 0) {
          return Response.json({ ok: true, responseId: null, benchmark: { total: 0, open: false, byQuestion: {} } });
        }

        const answers = parsed.answers as Record<string, string>;
        const { data: row, error } = await sb
          .from("study_responses")
          .insert({
            locale: parsed.locale,
            sector: answers["sector"] ?? null,
            size_band: answers["size"] ?? null,
            country: parsed.country || null,
            answers,
            completed: true,
            ip_hash: await ipHash(request),
            user_agent: request.headers.get("user-agent")?.slice(0, 240) ?? null,
          })
          .select("id")
          .single();

        if (error || !row) {
          console.error("[study-submit] insert failed", error?.message);
          return Response.json({ error: "Could not save answers." }, { status: 500 });
        }

        const { data: bench } = await sb.rpc("study_benchmark");
        return Response.json({ ok: true, responseId: row.id, benchmark: publicBenchmark(bench) });
      },
      GET: async () => {
        try {
          const mod = await import("@/lib/providers/cloud/service-role.server");
          const sb = mod.createServiceRoleClient();
          const { data } = await sb.rpc("study_benchmark");
          return Response.json({ benchmark: publicBenchmark(data) }, { headers: { "cache-control": "public, max-age=300" } });
        } catch {
          return Response.json({ benchmark: { total: 0, open: false, byQuestion: {} } });
        }
      },
    },
  },
});
