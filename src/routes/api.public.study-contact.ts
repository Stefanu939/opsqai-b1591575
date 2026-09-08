// Optional contact capture at the end of the public study. Never required.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { STUDY_LOCALES } from "@/i18n/pages/study";

const BodySchema = z.object({
  locale: z.enum(STUDY_LOCALES as unknown as [string, ...string[]]),
  responseId: z.string().uuid().optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email().max(255),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  country: z.string().trim().max(16).optional().or(z.literal("")),
  wantsReport: z.boolean().default(true),
  wantsPilot: z.boolean().default(false),
  consent: z.literal(true),
  website: z.string().max(0).optional().or(z.literal("")),
});

export const Route = createFileRoute("/api/public/study-contact")({
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
          return Response.json({ error: "Please check your email address." }, { status: 400 });
        }
        if ((parsed.website ?? "").length > 0) return Response.json({ ok: true });

        let sector: string | null = null;
        let sizeBand: string | null = null;
        if (parsed.responseId) {
          const { data: resp } = await sb
            .from("study_responses")
            .select("sector, size_band, country")
            .eq("id", parsed.responseId)
            .maybeSingle();
          sector = (resp?.sector as string | null) ?? null;
          sizeBand = (resp?.size_band as string | null) ?? null;
        }

        const { error } = await sb.from("study_contacts").insert({
          response_id: parsed.responseId || null,
          email: parsed.email,
          contact_name: parsed.contactName || null,
          company_name: parsed.companyName || null,
          country: parsed.country || null,
          locale: parsed.locale,
          wants_report: parsed.wantsReport,
          wants_pilot: parsed.wantsPilot,
          consent: true,
          sector,
          size_band: sizeBand,
        });

        if (error) {
          console.error("[study-contact] insert failed", error.message);
          return Response.json({ error: "Could not save your details." }, { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
