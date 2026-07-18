import { getCloudSupabase } from "@/lib/providers/not-available";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { getActorRoles, getProfileCompany, requirePermission } from "@/lib/authorization";
import { assertModuleForCompany } from "@/lib/license-enforcement.server";
import { getKnowledgeRepository, getStorageProvider } from "@/lib/providers/registry";


const AI_AUDIT_MODULE = "ai_workspace_audit" as const;

async function ensurePerm(context: any, perm: string) {
  await requirePermission(context, perm);
}

async function resolveCompany(context: any, explicitCompanyId?: string | null) {
  const actor = await getActorRoles(getCloudSupabase(context, "ai-features"), context.userId);
  if (actor.isPlatformAdmin && explicitCompanyId) return explicitCompanyId;
  const companyId = await getProfileCompany(getCloudSupabase(context, "ai-features"), context.userId);
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
  .middleware([requireAuth])
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

const ValInput = z.object({
  markdown: z.string().min(20),
  language: z.enum(["en", "de", "ro"]).default("en"),
});
/** AI SOP Validator — scores draft and returns suggestions / risk warnings. */
export const validateSop = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
    if (!m)
      return {
        score: 70,
        issues: [],
        suggestions: [],
        summary: "Validator response could not be parsed.",
      };
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) => PublishInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "sop.publish");
    const companyId = await resolveCompany(context, data.company_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${companyId}/${crypto.randomUUID()}-${data.title.replace(/[^a-z0-9]+/gi, "-")}.md`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("knowledge-docs")
      .upload(path, new Blob([data.markdown], { type: "text/markdown" }), {
        contentType: "text/markdown",
        upsert: false,
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
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // chunk + embed via existing pipeline
    try {
      const { reprocessDocument } = await import("@/lib/kb.functions");
      await (reprocessDocument as any).handler?.({ data: { id: doc.id }, context });
    } catch {
      /* indexed asynchronously elsewhere */
    }

    try {
      await getCloudSupabase(context, "ai-features").from("notifications").insert({
        company_id: companyId,
        user_id: context.userId,
        kind: "ai_sop_generated",
        title: `New AI-generated SOP: ${data.title}`,
        body: data.doc_code ?? "",
      });
    } catch {
      /* notification optional */
    }

    return { id: doc.id };
  });

// -------- Heuristic scoring helpers for the enterprise audit --------
const CATEGORY_KEYS = [
  "knowledge_management",
  "documentation",
  "sop_coverage",
  "compliance",
  "training",
  "ai_readiness",
  "governance",
  "operational_excellence",
  "risk_management",
  "data_quality",
] as const;

function maturityLevel(score: number) {
  if (score >= 85) return { level: 5, name: "AI Ready" };
  if (score >= 70) return { level: 4, name: "Optimized" };
  if (score >= 55) return { level: 3, name: "Managed" };
  if (score >= 35) return { level: 2, name: "Developing" };
  return { level: 1, name: "Initial" };
}

function riskFrom(score: number) {
  if (score >= 75) return "low";
  if (score >= 55) return "medium";
  if (score >= 35) return "high";
  return "critical";
}

function heuristicCategoryScores(input: {
  kpi: any;
  health: any;
  status: any;
  top: any[];
  critical: any[];
}) {
  const kpi = input.kpi ?? {};
  const health = input.health ?? {};
  const healthScore = Number(health.score ?? 60);
  const docCount = Number(kpi.knowledge_docs ?? kpi.documents ?? 0);
  const sopCount = Number(kpi.sops ?? kpi.sop_count ?? 0);
  const criticalMissing = Array.isArray(input.critical) ? input.critical.length : 0;
  const trainingCompletion = Number(kpi.training_completion ?? kpi.academy_completion ?? 0);
  const confidence = Number(kpi.avg_confidence ?? kpi.knowledge_confidence ?? 0.6) * 100;
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  return {
    knowledge_management: clamp(confidence * 0.6 + Math.min(docCount, 40) * 1),
    documentation: clamp(Math.min(docCount, 50) * 1.6 + 20),
    sop_coverage: clamp(Math.min(sopCount, 40) * 2 + 10 - criticalMissing * 4),
    compliance: clamp(healthScore * 0.9),
    training: clamp(trainingCompletion || healthScore * 0.7),
    ai_readiness: clamp(confidence * 0.7 + healthScore * 0.3),
    governance: clamp(healthScore * 0.85),
    operational_excellence: clamp(healthScore),
    risk_management: clamp(85 - criticalMissing * 8),
    data_quality: clamp(confidence),
  };
}

function buildHeuristicReport(input: any) {
  const cats = heuristicCategoryScores(input);
  const catList = CATEGORY_KEYS.map((k) => ({
    key: k,
    label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: cats[k],
    status: cats[k] >= 70 ? "healthy" : cats[k] >= 50 ? "attention" : "at-risk",
    risk: riskFrom(cats[k]),
    note: "Derived from operational KPIs and workspace signals.",
  }));
  const overall = Math.round(catList.reduce((s, c) => s + c.score, 0) / catList.length);
  const ml = maturityLevel(overall);
  const weakest = [...catList].sort((a, b) => a.score - b.score).slice(0, 3);
  const strongest = [...catList].sort((a, b) => b.score - a.score).slice(0, 3);
  return {
    executiveSummary:
      `The organization operates at maturity level ${ml.level} (${ml.name}) with an overall score of ${overall}/100. ` +
      `Strengths concentrate in ${strongest.map((c) => c.label).join(", ")}, while ${weakest.map((c) => c.label).join(", ")} require executive attention before scaling AI operations.`,
    maturity: ml.name.toLowerCase().replace(" ", "_"),
    maturityLevel: ml.level,
    maturityName: ml.name,
    score: overall,
    categories: catList,
    strengths: strongest.map((c) => ({
      title: `Strong ${c.label}`,
      description: `${c.label} scored ${c.score}/100, above the enterprise baseline.`,
      impact: "Sustains operational reliability.",
      risk: c.risk,
      recommendation: "Maintain current practices and share as internal benchmark.",
      priority: "low",
    })),
    opportunities: catList
      .filter((c) => c.score >= 50 && c.score < 70)
      .map((c) => ({
        title: `Improve ${c.label}`,
        description: `${c.label} is developing (${c.score}/100).`,
        impact: "Medium — unlocks the next maturity level.",
        risk: c.risk,
        recommendation: `Invest in ${c.label} processes and tooling.`,
        priority: "medium",
      })),
    warnings: catList
      .filter((c) => c.score >= 35 && c.score < 50)
      .map((c) => ({
        title: `${c.label} below target`,
        description: `Score ${c.score}/100 indicates rising operational risk.`,
        impact: "Operational bottleneck likely within one quarter.",
        risk: c.risk,
        recommendation: `Assign an owner and remediation plan for ${c.label}.`,
        priority: "high",
      })),
    critical: catList
      .filter((c) => c.score < 35)
      .map((c) => ({
        title: `Critical gap in ${c.label}`,
        description: `Severe deficiency (${c.score}/100).`,
        impact: "High — regulatory, financial or safety exposure.",
        risk: "critical",
        recommendation: `Immediate remediation of ${c.label}.`,
        priority: "critical",
      })),
    priorityActions: weakest.map((c, i) => ({
      priority: i + 1,
      title: `Strengthen ${c.label}`,
      impact: c.score < 40 ? "High" : "Medium",
      effort: c.score < 40 ? "High" : "Medium",
      estimatedTime: c.score < 40 ? "2-4 weeks" : "1-2 weeks",
      department:
        c.key === "training" ? "HR / L&D" : c.key === "compliance" ? "Compliance" : "Operations",
      expectedScoreImprovement: Math.max(4, Math.round((70 - c.score) / 4)),
      action:
        c.key === "sop_coverage"
          ? "generate_sop"
          : c.key === "training"
            ? "assign_training"
            : c.key === "knowledge_management"
              ? "open_knowledge_gap"
              : "generate_policy",
    })),
    aiInsights: [
      overall < 60
        ? "Documentation growth is outpacing quality controls."
        : "Knowledge quality trends are aligning with growth.",
      cats.ai_readiness < 60
        ? "AI confidence remains below enterprise standards — improve source coverage."
        : "AI readiness meets baseline; monitor drift.",
      cats.training < 60
        ? "Training content is incomplete for critical roles."
        : "Training coverage is on track.",
      cats.risk_management < 60
        ? "Most operational risk originates from missing procedures."
        : "Risk posture is contained.",
      cats.compliance < 60
        ? "Compliance readiness requires focused remediation."
        : "Compliance readiness is improving.",
    ],
    riskMatrix: [
      {
        risk: "Missing critical SOPs",
        likelihood: cats.sop_coverage < 50 ? "high" : "medium",
        impact: "critical",
        severity: cats.sop_coverage < 50 ? "critical" : "high",
        mitigation: "Generate SOPs from Priority Actions.",
      },
      {
        risk: "Low AI confidence",
        likelihood: cats.ai_readiness < 60 ? "high" : "medium",
        impact: "high",
        severity: cats.ai_readiness < 60 ? "high" : "medium",
        mitigation: "Improve knowledge quality and coverage.",
      },
      {
        risk: "Training gaps",
        likelihood: cats.training < 60 ? "medium" : "low",
        impact: "high",
        severity: cats.training < 60 ? "high" : "medium",
        mitigation: "Assign mandatory learning paths.",
      },
      {
        risk: "Compliance drift",
        likelihood: cats.compliance < 60 ? "medium" : "low",
        impact: "critical",
        severity: cats.compliance < 60 ? "high" : "medium",
        mitigation: "Run ISO / GDPR gap remediation.",
      },
    ],
    compliance: [
      {
        framework: "ISO 9001",
        readiness: Math.round(cats.documentation * 0.5 + cats.sop_coverage * 0.5),
        missing:
          cats.sop_coverage < 60
            ? ["Documented critical SOPs", "Process ownership matrix"]
            : ["Annual internal audit"],
        recommendation: "Close SOP coverage gaps.",
      },
      {
        framework: "ISO 27001",
        readiness: Math.round(cats.governance * 0.4 + cats.compliance * 0.6),
        missing:
          cats.compliance < 60
            ? ["Access control policy", "Incident response plan"]
            : ["Annual risk review"],
        recommendation: "Formalize information security policies.",
      },
      {
        framework: "ISO 45001",
        readiness: Math.round(cats.risk_management * 0.6 + cats.operational_excellence * 0.4),
        missing: ["OH&S objectives", "Hazard register"],
        recommendation: "Document OH&S procedures.",
      },
      {
        framework: "GDPR",
        readiness: Math.round(cats.compliance * 0.7 + cats.data_quality * 0.3),
        missing:
          cats.compliance < 70 ? ["DPIA templates", "Data retention policy"] : ["ROPA refresh"],
        recommendation: "Refresh data protection artefacts.",
      },
      {
        framework: "EU AI Act",
        readiness: Math.round(cats.ai_readiness * 0.6 + cats.governance * 0.4),
        missing: ["AI risk classification", "Human-oversight policy"],
        recommendation: "Establish AI governance controls.",
      },
    ],
    kpis: {
      knowledge_confidence: Math.round(cats.knowledge_management),
      knowledge_coverage: Math.round(cats.documentation),
      critical_sop_coverage: Math.round(cats.sop_coverage),
      training_completion: Math.round(cats.training),
      compliance_readiness: Math.round(cats.compliance),
      ai_readiness: Math.round(cats.ai_readiness),
      knowledge_gaps: Math.max(0, 100 - Math.round(cats.knowledge_management)),
      operational_risk: 100 - Math.round(cats.risk_management),
      document_freshness: Math.round(cats.data_quality),
      employee_adoption: Math.round(cats.training * 0.6 + cats.operational_excellence * 0.4),
    },
    benchmark: {
      knowledge_management:
        cats.knowledge_management >= 70
          ? "above_average"
          : cats.knowledge_management >= 50
            ? "average"
            : "below_average",
      compliance:
        cats.compliance >= 70
          ? "above_average"
          : cats.compliance >= 50
            ? "average"
            : "below_average",
      training:
        cats.training >= 70 ? "above_average" : cats.training >= 50 ? "average" : "below_average",
      ai_readiness:
        cats.ai_readiness >= 75 ? "top_20" : cats.ai_readiness >= 60 ? "above_average" : "average",
    },
    passedCount: catList.filter((c) => c.score >= 70).length,
    warningsCount: catList.filter((c) => c.score >= 40 && c.score < 70).length,
    criticalCount: catList.filter((c) => c.score < 40).length,
  };
}

/** AI Workspace Audit — Enterprise Operational Maturity Assessment. */
export const runWorkspaceAudit = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "ai_audit.run");
    const companyId = await resolveCompany(context, data.company_id);
    await assertModuleForCompany(companyId, AI_AUDIT_MODULE);

    const [kpi, health, status, top, critical] = await Promise.all([
      getCloudSupabase(context, "ai-features").rpc("dashboard_kpis", { p_company: companyId }),
      getCloudSupabase(context, "ai-features").rpc("dashboard_health", { p_company: companyId }),
      getCloudSupabase(context, "ai-features").rpc("dashboard_knowledge_status", { p_company: companyId }),
      getCloudSupabase(context, "ai-features").rpc("dashboard_top_sops", { p_company: companyId, p_limit: 10 }),
      getCloudSupabase(context, "ai-features").rpc("dashboard_critical_sops", { p_company: companyId }),
    ]);

    const heuristic = buildHeuristicReport({
      kpi: kpi.data,
      health: health.data,
      status: status.data,
      top: top.data ?? [],
      critical: critical.data ?? [],
    });

    const sys = `You are a senior operations consultant (Deloitte / PwC style) producing an executive Operational Maturity Assessment.
Use the provided heuristic scoring as ground truth and enrich the narrative with concrete, business-relevant findings.
Return STRICT JSON only, matching this schema (keep all keys):
{
 "executiveSummary": string,
 "maturityLevel": 1|2|3|4|5,
 "maturityName": "Initial"|"Developing"|"Managed"|"Optimized"|"AI Ready",
 "score": 0-100,
 "categories": [{"key":string,"label":string,"score":0-100,"status":"healthy|attention|at-risk","risk":"low|medium|high|critical","note":string}],
 "strengths": [{"title":string,"description":string,"impact":string,"risk":string,"recommendation":string,"priority":"low|medium|high|critical"}],
 "opportunities": [ ...same shape ],
 "warnings": [ ...same shape ],
 "critical": [ ...same shape ],
 "priorityActions": [{"priority":1|2|3|4|5,"title":string,"impact":"Low|Medium|High","effort":"Low|Medium|High","estimatedTime":string,"department":string,"expectedScoreImprovement":int,"action":"generate_sop|generate_policy|generate_work_instruction|create_quiz|assign_training|run_new_audit|open_knowledge_gap|generate_template"}],
 "aiInsights": [string],
 "riskMatrix": [{"risk":string,"likelihood":"low|medium|high","impact":"low|medium|high|critical","severity":"low|medium|high|critical","mitigation":string}],
 "compliance": [{"framework":string,"readiness":0-100,"missing":[string],"recommendation":string}],
 "kpis": {"knowledge_confidence":0-100,"knowledge_coverage":0-100,"critical_sop_coverage":0-100,"training_completion":0-100,"compliance_readiness":0-100,"ai_readiness":0-100,"knowledge_gaps":int,"operational_risk":0-100,"document_freshness":0-100,"employee_adoption":0-100},
 "benchmark": {"knowledge_management":string,"compliance":string,"training":string,"ai_readiness":string},
 "passed": int, "warnings": int, "critical_count": int
}. Frameworks MUST include ISO 9001, ISO 27001, ISO 45001, GDPR and EU AI Act. Provide 3-5 items in each findings list where possible. JSON only, no prose.`;

    const payload = JSON.stringify({
      heuristic,
      signals: {
        kpis: kpi.data,
        health: health.data,
        knowledgeStatus: status.data,
        topSops: top.data,
        criticalSops: critical.data,
      },
    });

    let report: any = heuristic;
    try {
      const text = await callLlm(payload, sys);
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        // Merge — AI narrative wins where present, heuristic fills the rest.
        report = { ...heuristic, ...parsed };
        // Preserve category scoring integrity when AI drifts
        if (!Array.isArray(parsed.categories) || parsed.categories.length < 5)
          report.categories = heuristic.categories;
        if (!parsed.kpis) report.kpis = heuristic.kpis;
        if (!Array.isArray(parsed.compliance) || parsed.compliance.length < 5)
          report.compliance = heuristic.compliance;
        if (!Array.isArray(parsed.riskMatrix) || parsed.riskMatrix.length < 3)
          report.riskMatrix = heuristic.riskMatrix;
      }
    } catch {
      // fallback to heuristic
    }

    const score = Math.max(0, Math.min(100, Math.round(Number(report.score) || heuristic.score)));
    const ml = maturityLevel(score);
    report.score = score;
    report.maturityLevel = ml.level;
    report.maturityName = ml.name;

    // projection based on priority actions expected improvements
    const gains = (report.priorityActions ?? []).map(
      (a: any) => Number(a.expectedScoreImprovement) || 0,
    );
    report.projection = {
      current: score,
      afterPriority1: Math.min(100, score + (gains[0] ?? 0)),
      afterPriority2: Math.min(100, score + (gains[0] ?? 0) + (gains[1] ?? 0)),
      projected: Math.min(100, score + gains.reduce((s: number, g: number) => s + g, 0)),
      timeline: gains.length >= 3 ? "3-6 weeks" : gains.length >= 1 ? "2-3 weeks" : "n/a",
    };

    const rpt = report as any;
    const passedN = Number(rpt.passed) || heuristic.passedCount;
    const warnN = Number(rpt.warnings) || heuristic.warningsCount;
    const critN = Number(
      rpt.critical_count ??
        (Array.isArray(rpt.critical) ? rpt.critical.length : heuristic.criticalCount),
    );

    const { data: row, error } = await getCloudSupabase(context, "ai-features")
      .from("ai_audits")
      .insert({
        company_id: companyId,
        requested_by: context.userId,
        score,
        maturity: String(rpt.maturityName || ml.name)
          .toLowerCase()
          .replace(" ", "_"),
        summary: report,
        passed: passedN,
        warnings: warnN,
        critical: critN,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    try {
      await getCloudSupabase(context, "ai-features").from("notifications").insert({
        company_id: companyId,
        user_id: context.userId,
        kind: "workspace_audit_ready",
        title: `Workspace audit complete — score ${score}/100 (${ml.name})`,
        body: String(report.executiveSummary || "").slice(0, 240),
      });
    } catch {
      /* notification optional */
    }

    return { id: row.id, score, report };
  });

export const listAiAudits = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const companyId = await resolveCompany(context, data.company_id);
    await assertModuleForCompany(companyId, AI_AUDIT_MODULE);
    const actor = await getActorRoles(getCloudSupabase(context, "ai-features"), context.userId);
    let query = getCloudSupabase(context, "ai-features")
      .from("ai_audits")
      .select("id, score, maturity, passed, warnings, critical, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (actor.isPlatformAdmin && data.company_id) query = query.eq("company_id", data.company_id);
    const { data: audits } = await query;
    return { audits: audits ?? [] };
  });
