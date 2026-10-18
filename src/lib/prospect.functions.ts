// Prospect Mode: any signed-in visitor can talk to Kai; contact data reaches
// OPSQAI only through the explicit consent form (stored + CRM lead).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";

type Ctx = { supabase: any; userId: string; claims?: unknown };
const emailOf = (c: Ctx) => (c.claims as { email?: string } | undefined)?.email ?? null;

export const getProspectStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data: acc } = await c.supabase
      .from("prospect_accounts")
      .select("data_consent")
      .eq("user_id", c.userId)
      .maybeSingle();
    const { data: prof } = await c.supabase
      .from("profiles")
      .select("company_id")
      .eq("id", c.userId)
      .maybeSingle();
    const { count } = await c.supabase
      .from("prospect_leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", c.userId);
    return {
      isProspect: Boolean(acc),
      hasCompany: Boolean(prof?.company_id),
      dataConsent: Boolean(acc?.data_consent),
      submitted: (count ?? 0) > 0,
    };
  });

export const registerProspect = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ dataConsent: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { error } = await c.supabase
      .from("prospect_accounts")
      .upsert({ user_id: c.userId, email: emailOf(c), data_consent: data.dataConsent });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const LeadSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  company_name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional().default(""),
  employees: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().max(1500).optional().default(""),
  consent_contact: z.literal(true),
  transcript: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(40)
    .default([]),
});

export const submitProspectLead = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => LeadSchema.parse(d))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const email = emailOf(c);
    if (!email) throw new Error("Contul nu are o adresă de email.");
    // Transcript is shared with OPSQAI only if the visitor agreed at sign-up.
    const { data: acc } = await c.supabase
      .from("prospect_accounts")
      .select("data_consent")
      .eq("user_id", c.userId)
      .maybeSingle();
    const transcript = acc?.data_consent ? data.transcript : [];

    let crmId: string | null = null;
    try {
      const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
      const admin = await getCloudSupabaseAdmin("portal");
      const lines = [
        "Sursa: Prospect Mode (Kai)",
        data.employees && `Angajați: ${data.employees}`,
        data.message && `Mesaj: ${data.message}`,
        transcript.length
          ? "\n--- Conversație Kai ---\n" +
            transcript.map((m) => `${m.role === "user" ? "Prospect" : "Kai"}: ${m.content}`).join("\n\n")
          : "",
      ].filter(Boolean);
      const { data: lead } = await admin
        .from("crm_leads")
        .insert({
          company_name: data.company_name,
          contact_name: data.full_name,
          email,
          phone: data.phone || null,
          source: "prospect_mode",
          source_ref: c.userId,
          stage: "new",
          language: "ro",
          notes: lines.join("\n").slice(0, 20000),
        })
        .select("id")
        .single();
      crmId = lead?.id ?? null;
    } catch (e) {
      console.error("prospect crm insert failed", e);
    }

    const { error } = await c.supabase.from("prospect_leads").insert({
      user_id: c.userId,
      email,
      full_name: data.full_name,
      company_name: data.company_name,
      phone: data.phone || null,
      employees: data.employees || null,
      message: data.message || null,
      consent_contact: true,
      crm_lead_id: crmId,
      transcript,
    });
    if (error) throw new Error(error.message);
    return { ok: true, crmLeadId: crmId };
  });
