import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getActorRoles, getProfileCompany, requirePermission } from "@/lib/authorization";

async function ensurePerm(context: any, perm: string) {
  await requirePermission(context, perm);
}

async function resolveCompany(context: any, explicitCompanyId?: string | null) {
  const actor = await getActorRoles(context.supabase, context.userId);
  if (actor.isPlatformAdmin && explicitCompanyId) return explicitCompanyId;
  const companyId = await getProfileCompany(context.supabase, context.userId);
  if (!companyId) throw new Error("No company selected");
  return companyId;
}

async function callLlm(prompt: string, system?: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI gateway unavailable");
  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const gw = createLovableAiGatewayProvider(apiKey);
  const { text } = await generateText({
    model: gw("google/gemini-3-flash-preview"),
    temperature: 0.3,
    system,
    prompt,
  });
  return text;
}

const GenInput = z.object({
  title: z.string().min(2),
  department: z.string().optional().nullable(),
  category: z.string().min(1),
  purpose: z.string().min(2),
  inputs: z.string().optional().default(""),
  outputs: z.string().optional().default(""),
  responsibleRole: z.string().optional().default(""),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  approvalLevel: z.enum(["supervisor", "manager", "admin"]).default("manager"),
  language: z.enum(["en", "de", "ro"]).default("en"),
});

/**
 * AI SOP Generator — returns a structured Markdown SOP draft.
 * Does NOT publish; the user reviews & clicks publish separately.
 */
export const generateSop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "sop.generate");
    const sys = `You write enterprise Standard Operating Procedures in clean Markdown.
Sections (in order): Title, Purpose, Scope, Roles & Responsibilities, Inputs, Procedure (numbered steps), Safety & Risks, Outputs, Approvals, Revision History.
Be specific, numeric where possible, avoid filler. Output ONLY the markdown.`;
    const prompt = `Language: ${data.language.toUpperCase()}
Title: ${data.title}
Department: ${data.department ?? "—"}
Category: ${data.category}
Risk: ${data.riskLevel}
Approval level: ${data.approvalLevel}
Responsible role: ${data.responsibleRole || "—"}
Purpose: ${data.purpose}
Inputs: ${data.inputs}
Expected outputs: ${data.outputs}

Produce the SOP now.`;
    const markdown = await callLlm(prompt, sys);
    return { markdown };
  });

const ValInput = z.object({ markdown: z.string().min(20), language: z.enum(["en","de","ro"]).default("en") });
/** AI SOP Validator — scores draft and returns suggestions / risk warnings. */
export const validateSop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ValInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "sop.generate");
    const sys = `You are a senior SOP auditor. Given a draft SOP in Markdown, output a strict JSON object: {
 "score": 0-100, "issues":[{"type":"missing_step|duplicate|grammar|formatting|unsafe|missing_responsibility|missing_approval|coverage","severity":"info|warning|critical","message":"..."}],
 "suggestions":["..."],
 "summary":"one sentence"
}. Output JSON only, no commentary.`;
    const text = await callLlm(`Language: ${data.language}\n\nSOP DRAFT:\n${data.markdown}`, sys);
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { score: 70, issues: [], suggestions: [], summary: "Validator response could not be parsed." };
    try {
      const parsed = JSON.parse(m[0]);
      return {
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 50) : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 20) : [],
        summary: String(parsed.summary || ""),
      };
    } catch {
      return { score: 70, issues: [], suggestions: [], summary: "Validator parse failed." };
    }
  });

const PublishInput = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  doc_code: z.string().optional().nullable(),
  markdown: z.string().min(20),
  language: z.enum(["en", "de", "ro"]).default("en"),
  company_id: z.string().uuid().optional().nullable(),
});
/** Publish a generated SOP straight into knowledge_documents (as a synthetic text file). */
export const publishGeneratedSop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PublishInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "sop.publish");
    const companyId = await resolveCompany(context, data.company_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${companyId}/${crypto.randomUUID()}-${data.title.replace(/[^a-z0-9]+/gi, "-")}.md`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("knowledge-docs").upload(path, new Blob([data.markdown], { type: "text/markdown" }), {
        contentType: "text/markdown", upsert: false,
      });
    if (upErr) throw new Error(upErr.message);

    const { data: doc, error } = await supabaseAdmin
      .from("knowledge_documents")
      .insert({
        title: data.title,
        category: data.category,
        doc_code: data.doc_code ?? null,
        file_path: path,
        file_type: "text/markdown",
        content_text: data.markdown,
        status: "ready",
        uploaded_by: context.userId,
        company_id: companyId,
      })
      .select("id").single();
    if (error) throw new Error(error.message);

    // chunk + embed via existing pipeline
    try {
      const { reprocessDocument } = await import("@/lib/kb.functions");
      await (reprocessDocument as any).handler?.({ data: { id: doc.id }, context });
    } catch { /* indexed asynchronously elsewhere */ }

    try {
      await context.supabase.from("notifications").insert({
        company_id: companyId, user_id: context.userId,
        kind: "ai_sop_generated", title: `New AI-generated SOP: ${data.title}`,
        body: data.doc_code ?? "",
      });
    } catch { /* notification optional */ }

    return { id: doc.id };
  });

/** AI Workspace Audit — synthesises an audit report and stores it. */
export const runWorkspaceAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "ai_audit.run");
    const companyId = await resolveCompany(context, data.company_id);

    const [kpi, health, status, top, critical] = await Promise.all([
      context.supabase.rpc("dashboard_kpis", { p_company: companyId }),
      context.supabase.rpc("dashboard_health", { p_company: companyId }),
      context.supabase.rpc("dashboard_knowledge_status", { p_company: companyId }),
      context.supabase.rpc("dashboard_top_sops", { p_company: companyId, p_limit: 10 }),
      context.supabase.rpc("dashboard_critical_sops", { p_company: companyId }),
    ]);

    const sys = `You are an operations consultant producing an executive Workspace Audit report.
Return strict JSON: {
 "executiveSummary":"...","maturity":"initial|developing|defined|managed|optimizing",
 "score":0-100,
 "risks":["..."], "recommendations":["..."], "priorityActions":["..."],
 "passed":int,"warnings":int,"critical":int
}. JSON only.`;
    const payload = JSON.stringify({
      kpis: kpi.data, health: health.data, knowledgeStatus: status.data,
      topSops: top.data, criticalSops: critical.data,
    });
    let report: any = {};
    try {
      const text = await callLlm(payload, sys);
      const m = text.match(/\{[\s\S]*\}/);
      if (m) report = JSON.parse(m[0]);
    } catch {
      const hs = (health.data as any)?.score ?? 60;
      report = { executiveSummary: "Heuristic audit (AI unavailable).", maturity: "developing", score: hs, risks: [], recommendations: [], priorityActions: [], passed: 0, warnings: 0, critical: 0 };
    }
    const hs = (health.data as any)?.score ?? 0;
    const score = Math.max(0, Math.min(100, Number(report.score) || hs));

    const { data: row, error } = await context.supabase
      .from("ai_audits")
      .insert({
        company_id: companyId,
        requested_by: context.userId,
        score,
        maturity: String(report.maturity || "developing"),
        summary: report,
        passed: Number(report.passed) || 0,
        warnings: Number(report.warnings) || 0,
        critical: Number(report.critical) || 0,
      })
      .select("id").single();
    if (error) throw new Error(error.message);

    try {
      await context.supabase.from("notifications").insert({
        company_id: companyId, user_id: context.userId,
        kind: "workspace_audit_ready",
        title: `Workspace audit complete — score ${score}/100`,
        body: String(report.executiveSummary || "").slice(0, 240),
      });
    } catch { /* notification optional */ }

    return { id: row.id, score, report };
  });

export const listAiAudits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const actor = await getActorRoles(context.supabase, context.userId);
    let query = context.supabase
      .from("ai_audits")
      .select("id, score, maturity, passed, warnings, critical, summary, created_at")
      .order("created_at", { ascending: false }).limit(50);
    if (actor.isPlatformAdmin && data.company_id) query = query.eq("company_id", data.company_id);
    const { data: audits } = await query;
    return { audits: audits ?? [] };
  });
