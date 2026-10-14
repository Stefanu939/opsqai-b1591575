// Kai — Customer Portal assistant (support + value consultant).
// Grounded on the official OPSQAI product facts below; never invents prices,
// certifications, features or timelines. Escalation creates a normal support
// ticket client-side with the full transcript.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { generateAiText } from "@/lib/ai-provider.server";

const PRODUCT_FACTS = `
OFFICIAL OPSQAI FACTS (the only product truth you may use):
- OPSQAI is an operations platform installed on the customer's own Windows server (Self-Hosted). Data stays in the company; the customer is the Data Controller.
- Local AI assistant runs on the customer's machine (no data sent to external AI). Answers are grounded in the company's own documents (SOPs, procedures, FAQs) with citations; when nothing relevant exists it says so instead of guessing.
- Core (free): knowledge base with document upload, AI assistant over company documents, FAQs, Academy (training with short quizzes), users and roles, audit trail.
- Licensed modules: Transport (fleet, trips, drivers, documents), HR (employees, time off, onboarding, documents). All modules are activated by licence.
- Custom module: OPSQAI builds a module tailored to the customer's business process (any industry: salons, workshops, clinics, retail, production, logistics...). Scope is agreed with the OPSQAI team.
- Multi-PC: one company server, other PCs as workstations; remote workstations can be paired securely.
- Updates are delivered through the Customer Portal (Downloads); licences and installation status are visible in the portal.
- Pilot: free 30-day pilot. Pricing is discussed only with an OPSQAI consultant — never quote prices.
- No ISO/DORA or other certification claims.
`;

const SYSTEM = `You are Kai, the OPSQAI assistant inside the Customer Portal. You act as a perfect employee: customer support, onboarding guide and honest value consultant.
${PRODUCT_FACTS}
RULES:
- Reply in the language of the customer's last message (Romanian, German or English). Be warm, concise, concrete. Use short paragraphs or bullets.
- Only state facts listed above. If a capability is not listed, say it is not a standard module and propose how a Custom module could cover it, with 2-4 concrete implementation ideas fitted to their business. Never claim it already exists.
- ROI / savings questions: compute transparently from the customer's own numbers (show the formula: people x minutes saved/day x working days x hourly cost). If numbers are missing, ask for them or state clearly labelled example assumptions. Always mark results as an estimate, not a guarantee. Never give prices.
- Account/licence/install questions: use the account context given; if it is missing, say you don't see it and suggest Downloads/Subscription pages or a colleague.
- Never mention internal staff by name. If you cannot solve something, or the customer asks for a human, offer to pass the case to "un specialist din echipa OPSQAI" (or the equivalent in their language) via the escalation button.
- Never invent prices, dates, benchmarks, certifications or features.`;

export const askPortalKai = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .min(1)
          .max(40),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let account = "unknown";
    try {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("company_id")
        .eq("id", context.userId)
        .maybeSingle();
      if (prof?.company_id) {
        const { data: co } = await context.supabase
          .from("companies")
          .select("name")
          .eq("id", prof.company_id)
          .maybeSingle();
        account = `Company: ${(co as { name?: string } | null)?.name ?? "(name unavailable)"}`;
      }
    } catch {
      /* context optional */
    }
    try {
      const text = await generateAiText({
        role: "chat",
        system: `${SYSTEM}\n\nACCOUNT CONTEXT: ${account}`,
        messages: data.messages.slice(-20),
      });
      return { ok: true as const, text: text.trim() };
    } catch (e) {
      return { ok: false as const, text: e instanceof Error ? e.message : "Kai is unavailable" };
    }
  });
