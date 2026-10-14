// Kai — Customer Portal assistant (support + value consultant).
// Grounded on the official OPSQAI product facts below; never invents prices,
// certifications, features or timelines. Escalation creates a normal support
// ticket client-side with the full transcript.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { KAI_RICH_FORMAT } from "@/lib/kai-rich-format";
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
    const account = await loadAccountContext(context);
    try {
      const text = await generateAiText({
        role: "chat",
        system: `${SYSTEM}\n${KAI_RICH_FORMAT}\n\nACCOUNT CONTEXT (real data for this customer only):\n${account.text}`,
        messages: data.messages.slice(-20),
      });
      return { ok: true as const, text: text.trim() };
    } catch (e) {
      return { ok: false as const, text: e instanceof Error ? e.message : "Kai is unavailable" };
    }
  });

type Ctx = { supabase: any; userId: string; claims?: unknown };

const d = (s: string | null | undefined) => (s ? s.slice(0, 10) : "n/a");

/** Real account context: company, licences (by contact email) and installation status. */
async function loadAccountContext(context: Ctx) {
  const lines: string[] = [];
  let companyId: string | null = null;
  let companyName: string | null = null;
  try {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("company_id")
      .eq("id", context.userId)
      .maybeSingle();
    companyId = prof?.company_id ?? null;
    if (companyId) {
      const { data: co } = await context.supabase
        .from("companies")
        .select("name, created_at")
        .eq("id", companyId)
        .maybeSingle();
      companyName = co?.name ?? null;
      lines.push(`Company: ${co?.name ?? "(unknown)"} (client since ${d(co?.created_at)})`);
    }
  } catch {
    /* optional */
  }
  const email = (context.claims as { email?: string } | undefined)?.email ?? null;
  if (email) {
    try {
      const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
      const admin = await getCloudSupabaseAdmin("portal");
      const { data: lic } = await admin
        .from("licenses")
        .select("install_id, kind, module_key, seats, expires_at, maintenance_expires_at, revoked, suspended")
        .eq("contact_email", email)
        .limit(50);
      const today = new Date().toISOString();
      const state = (r: { revoked: boolean; suspended: boolean; expires_at: string | null }) =>
        r.revoked ? "REVOKED" : r.suspended ? "SUSPENDED" : r.expires_at && r.expires_at < today ? "EXPIRED" : "active";
      const ids = [...new Set((lic ?? []).map((r: { install_id: string }) => r.install_id))];
      for (const r of lic ?? []) {
        lines.push(
          r.kind === "install"
            ? `Installation licence ${r.install_id}: ${state(r)}, seats ${r.seats ?? "n/a"}, expires ${d(r.expires_at)}, updates/maintenance until ${d(r.maintenance_expires_at)}`
            : `Module licence "${r.module_key}" (install ${r.install_id}): ${state(r)}, expires ${d(r.expires_at)}`,
        );
      }
      if (ids.length) {
        const { data: inst } = await admin
          .from("selfhost_installations")
          .select("install_id, app_version, last_heartbeat_at, reported_status, enabled_modules")
          .in("install_id", ids);
        for (const i of inst ?? []) {
          lines.push(
            `Installation ${i.install_id}: version ${i.app_version ?? "n/a"}, status ${i.reported_status ?? "n/a"}, last online ${i.last_heartbeat_at ?? "never"}, enabled modules ${JSON.stringify(i.enabled_modules ?? [])}`,
          );
        }
      }
      if (!lic?.length) lines.push("No licences found for this account yet (new prospect — focus on value and the free 30-day pilot).");
    } catch {
      lines.push("Licence data unavailable right now.");
    }
  }
  return { text: lines.join("\n") || "unknown", companyId, companyName };
}

const BriefSchema = z.object({
  need: z.string(),
  discussed: z.string(),
  opportunity: z.string(),
  next_steps: z.array(z.string()).default([]),
  category: z.enum(["technical", "licence", "sales", "custom_module", "account", "other"]).default("other"),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  sentiment: z.enum(["positive", "neutral", "frustrated"]).default("neutral"),
  business_type: z.string().default(""),
});
export type KaiBrief = z.infer<typeof BriefSchema>;

/** Escalate a Kai conversation: ticket with transcript + internal staff brief (hidden from customer). */
export const escalatePortalKai = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((x: unknown) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .min(1)
          .max(60),
        context: z.record(z.string(), z.any()).default({}),
      })
      .parse(x),
  )
  .handler(async ({ data, context }) => {
    const account = await loadAccountContext(context);
    if (!account.companyId) throw new Error("Contul nu este asociat unei companii.");
    const transcript = data.messages
      .map((m) => `${m.role === "user" ? "Client" : "Kai"}: ${m.content}`)
      .join("\n\n");

    let brief: KaiBrief | null = null;
    try {
      const raw = await generateAiText({
        role: "chat",
        system: `You write an INTERNAL brief for OPSQAI staff (support, technicians, sales) about a customer conversation with Kai. Write in Romanian. Be factual — only what the transcript and account context show; never invent. Return ONLY JSON: {"need": "what the customer wants/problem, 1-2 sentences", "discussed": "what Kai explained/tried, 1-3 sentences", "opportunity": "what OPSQAI could implement or offer (module, Custom module ideas, pilot, fix), 1-3 sentences", "next_steps": ["concrete action for staff", ...max 4], "category": "technical|licence|sales|custom_module|account|other", "priority": "low|normal|high|critical", "sentiment": "positive|neutral|frustrated", "business_type": "customer's industry if mentioned, else empty"}\n\nACCOUNT CONTEXT:\n${account.text}`,
        messages: [{ role: "user", content: transcript.slice(0, 20000) }],
      });
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) brief = BriefSchema.parse(JSON.parse(m[0]));
    } catch {
      brief = null;
    }

    const first = data.messages.find((m) => m.role === "user")?.content ?? "Cerere asistență";
    const { data: conv, error } = await context.supabase
      .from("support_conversations")
      .insert({
        company_id: account.companyId,
        opened_by: context.userId,
        subject: `Kai → specialist: ${(brief?.need || first).slice(0, 150)}`,
        priority: brief?.priority ?? "normal",
        context: { ...data.context, source: "kai", category: brief?.category ?? null },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: mErr } = await context.supabase.from("support_messages").insert({
      conversation_id: conv.id,
      sender_id: context.userId,
      sender_kind: "customer",
      body: `Conversația cu Kai înainte de escaladare:\n\n${transcript}`.slice(0, 10000),
      attachments: [],
      context: { source: "kai_transcript" },
    });
    if (mErr) throw new Error(mErr.message);

    // Internal note — RLS hides internal notes from customers.
    try {
      const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
      const admin = await getCloudSupabaseAdmin("support");
      const b = brief;
      const body = b
        ? `Fișă Kai\nNevoie: ${b.need}\nDiscutat: ${b.discussed}\nOportunitate: ${b.opportunity}\nPași: ${b.next_steps.join("; ")}`
        : "Fișă Kai indisponibilă — citește transcriptul.";
      await admin.from("support_messages").insert({
        conversation_id: conv.id,
        sender_id: context.userId,
        sender_kind: "platform",
        internal_note: true,
        body,
        attachments: [],
        context: { kind: "kai_brief", brief: b, account: account.text, message_count: data.messages.length },
      });
    } catch {
      /* brief is best-effort; transcript already saved */
    }
    return { id: conv.id as string };
  });
