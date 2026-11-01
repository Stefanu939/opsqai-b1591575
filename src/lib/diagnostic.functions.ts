// MC operational diagnostic: generate (AI), export PDF, send via Strato. Staff only.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { uuidString } from "@/lib/zod-uuid";

async function loadLead(context: unknown, id: string) {
  await requirePlatformAdmin(context as never);
  const admin = await getCloudSupabaseAdmin("crm");
  const { data: lead } = await admin
    .from("crm_leads")
    .select("id, company_name, contact_name, email, notes")
    .eq("id", id)
    .maybeSingle();
  if (!lead) throw new Error("Lead not found");
  return { admin, lead };
}

export const getDiagnosticStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context as never);
    const { stratoConfigured, stratoAutoSend } = await import("@/lib/diagnostic.server");
    return { strato: stratoConfigured(), autoSend: stratoAutoSend(), from: process.env.STRATO_SMTP_USER ?? null };
  });

export const generateLeadDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuidString(), message: z.string().trim().min(10).max(8000), role: z.string().max(120).nullish() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, lead } = await loadLead(context, data.id);
    const { generateDiagnosticText, DIAGNOSTIC_SUBJECT } = await import("@/lib/diagnostic.server");
    const text = await generateDiagnosticText({
      company: lead.company_name as string,
      contact: lead.contact_name as string | null,
      role: data.role ?? null,
      message: data.message,
    });
    await admin.from("crm_activities").insert({
      lead_id: data.id,
      kind: "note",
      subject: DIAGNOSTIC_SUBJECT,
      body: text,
      owner_user_id: (context as { userId: string }).userId,
    });
    return { text };
  });

export const renderDiagnosticPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString(), text: z.string().min(10).max(20000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { lead } = await loadLead(context, data.id);
    const { diagnosticPdf, toBase64, pdfFilename } = await import("@/lib/diagnostic.server");
    const bytes = diagnosticPdf(lead.company_name as string, lead.contact_name as string | null, data.text);
    return { filename: pdfFilename(lead.company_name as string), base64: toBase64(bytes) };
  });

export const sendDiagnosticEmail = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuidString(), to: z.string().email(), subject: z.string().min(1).max(200), body: z.string().min(10).max(30000), text: z.string().min(10).max(20000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, lead } = await loadLead(context, data.id);
    const s = await import("@/lib/diagnostic.server");
    const bytes = s.diagnosticPdf(lead.company_name as string, lead.contact_name as string | null, data.text);
    await s.sendStratoMail({
      to: data.to,
      subject: data.subject,
      text: data.body,
      attachment: { filename: s.pdfFilename(lead.company_name as string), bytes },
    });
    await admin.from("crm_activities").insert({
      lead_id: data.id,
      kind: "email",
      subject: `Diagnostic trimis: ${data.subject}`,
      body: `Trimis prin Strato către ${data.to}`,
      done_at: new Date().toISOString(),
      owner_user_id: (context as { userId: string }).userId,
    });
    return { ok: true };
  });
