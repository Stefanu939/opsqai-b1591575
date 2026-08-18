import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { getActorRoles, getProfileCompany, requirePermission } from "@/lib/authorization";
import { getAiAuditRepository, getComplianceRepository, getFaqRepository, getKnowledgeRepository, getStorageProvider } from "@/lib/providers/registry";
import { resolveCountryConfig, resolveFrameworks, FRAMEWORKS, type FrameworkKey } from "@/lib/compliance-registry";
import {
  resolveChatModel,
  hasAiCapability,
  transcribeAudio,
  synthesizeSpeech,
  AiCapabilityError,
  activeAiProviderLabel,
} from "@/lib/ai-provider.server";
import type { JsonLike } from "@/lib/providers/interfaces";
import { uuidString } from "@/lib/zod-uuid";


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
  const { generateText } = await import("ai");
  const { text } = await generateText({
    model: resolveChatModel("chat-fast"),
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
  company_id: uuidString().optional().nullable(),
});
/** Publish a generated SOP straight into knowledge_documents (as a synthetic text file). */
export const publishGeneratedSop = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => PublishInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "sop.publish");
    const companyId = await resolveCompany(context, data.company_id);

    const path = `${companyId}/${crypto.randomUUID()}-${data.title.replace(/[^a-z0-9]+/gi, "-")}.md`;
    const storage = getStorageProvider();
    await storage.put({
      bucket: "knowledge-docs",
      key: path,
      body: new TextEncoder().encode(data.markdown),
      contentType: "text/markdown",
    });

    const repo = getKnowledgeRepository(context.supabase);
    const doc = await repo.insertDocument({
      company_id: companyId,
      title: data.title,
      category: data.category,
      doc_code: data.doc_code ?? null,
      file_path: path,
      file_type: "text/markdown",
      uploaded_by: context.userId,
    });


    // chunk + embed via existing pipeline
    try {
      const { reprocessDocument } = await import("@/lib/kb.functions");
      await (reprocessDocument as any).handler?.({ data: { id: doc.id }, context });
    } catch {
      /* indexed asynchronously elsewhere */
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

function buildHeuristicReport(input: any, frameworks?: { key: string; name: string }[]) {
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
    compliance: (frameworks && frameworks.length
      ? frameworks
      : [
          { key: "iso_9001", name: "ISO 9001" },
          { key: "iso_27001", name: "ISO 27001" },
          { key: "iso_45001", name: "ISO 45001" },
          { key: "gdpr", name: "GDPR" },
          { key: "eu_ai_act", name: "EU AI Act" },
        ]
    ).map((f) => {
      switch (f.key) {
        case "iso_9001":
          return {
            framework: f.name,
            readiness: Math.round(cats.documentation * 0.5 + cats.sop_coverage * 0.5),
            missing:
              cats.sop_coverage < 60
                ? ["Documented critical SOPs", "Process ownership matrix"]
                : ["Annual internal audit"],
            recommendation: "Close SOP coverage gaps.",
          };
        case "iso_27001":
          return {
            framework: f.name,
            readiness: Math.round(cats.governance * 0.4 + cats.compliance * 0.6),
            missing:
              cats.compliance < 60
                ? ["Access control policy", "Incident response plan"]
                : ["Annual risk review"],
            recommendation: "Formalize information security policies.",
          };
        case "iso_45001":
          return {
            framework: f.name,
            readiness: Math.round(cats.risk_management * 0.6 + cats.operational_excellence * 0.4),
            missing: ["OH&S objectives", "Hazard register"],
            recommendation: "Document OH&S procedures.",
          };
        case "gdpr":
        case "bdsg":
        case "legea_190_2018":
          return {
            framework: f.name,
            readiness: Math.round(cats.compliance * 0.7 + cats.data_quality * 0.3),
            missing:
              cats.compliance < 70 ? ["DPIA templates", "Data retention policy"] : ["ROPA refresh"],
            recommendation: "Refresh data protection artefacts.",
          };
        case "eu_ai_act":
          return {
            framework: f.name,
            readiness: Math.round(cats.ai_readiness * 0.6 + cats.governance * 0.4),
            missing: ["AI risk classification", "Human-oversight policy"],
            recommendation: "Establish AI governance controls.",
          };
        default:
          return {
            framework: f.name,
            readiness: Math.round(cats.compliance),
            missing: ["Framework-specific gap review"],
            recommendation: "Review this framework's requirements against current documentation.",
          };
      }
    }),
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


/** Load the org's compliance context (country, language, terminology, frameworks) for prompt-building. Never throws — falls back to safe defaults. */
async function loadComplianceContext(dataCtx: unknown, companyId: string) {
  try {
    const repo = getComplianceRepository(dataCtx);
    const settings = await repo.get(companyId);
    const country = resolveCountryConfig(settings?.countryCode);
    const frameworkKeys = (settings?.frameworkKeys?.length
      ? settings.frameworkKeys
      : country.applicableFrameworks) as FrameworkKey[];
    const frameworks = resolveFrameworks(frameworkKeys);
    return {
      countryCode: country.code,
      countryName: country.name,
      primaryLanguage: settings?.primaryLanguage ?? country.defaultLanguage,
      terminologyNotes: country.terminologyNotes,
      dataProtectionContext: country.dataProtectionContext,
      frameworkKeys,
      frameworks,
    };
  } catch {
    const country = resolveCountryConfig(null);
    return {
      countryCode: country.code,
      countryName: country.name,
      primaryLanguage: country.defaultLanguage,
      terminologyNotes: country.terminologyNotes,
      dataProtectionContext: country.dataProtectionContext,
      frameworkKeys: country.applicableFrameworks,
      frameworks: resolveFrameworks(country.applicableFrameworks),
    };
  }
}

/** AI Workspace Audit — Enterprise Operational Maturity Assessment. */
export const runWorkspaceAudit = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: uuidString().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "ai_audit.run");
    const companyId = await resolveCompany(context, data.company_id);
    const [documents, faqs, compliance] = await Promise.all([
      getKnowledgeRepository(context.supabase).listDocuments(companyId, false),
      getFaqRepository(context.supabase).list(companyId),
      loadComplianceContext(context.supabase, companyId),
    ]);
    const ready = documents.filter((d) => d.status === "ready");
    const chunkCount = ready.reduce((sum, d) => sum + (d.chunk_count ?? 0), 0);
    const coverage = Math.min(100, ready.length * 8 + Math.min(40, chunkCount / 10));
    const kpi = { data: { knowledge_confidence: coverage, knowledge_coverage: coverage, critical_sop_coverage: Math.min(100, ready.filter((d)=>d.category.toLowerCase().includes("sop")).length*15), training_completion: 0, compliance_readiness: Math.min(100, faqs.length*4+ready.length*3), ai_readiness: ready.length?75:25 } };
    const health = { data: { document_count: documents.length, ready_count: ready.length, failed_count: documents.filter((d)=>d.status==="failed").length, faq_count: faqs.length } };
    const status = { data: { chunks: chunkCount, coverage } };
    const top = { data: ready.slice(0,10).map((d)=>({id:d.id,title:d.title,category:d.category,chunks:d.chunk_count})) };
    const critical = { data: documents.filter((d)=>d.status!=="ready").slice(0,10) };

    const heuristic = buildHeuristicReport(
      {
        kpi: kpi.data,
        health: health.data,
        status: status.data,
        top: top.data ?? [],
        critical: critical.data ?? [],
      },
      compliance.frameworks,
    );

    const frameworkNames = compliance.frameworks.map((f) => f.name).join(", ") || "GDPR, ISO 9001, ISO 27001, ISO 45001, EU AI Act";
    const sys = `You are a senior operations consultant (Deloitte / PwC style) producing an executive Operational Maturity Assessment.
Organization context (advisory only — never assert legal compliance, only flag what is "relevant to" or "requires review"):
- Country: ${compliance.countryName} (${compliance.countryCode})
- Primary language: ${compliance.primaryLanguage}
- Local terminology guidance: ${compliance.terminologyNotes}
- Data-protection context: ${compliance.dataProtectionContext}
- Selected compliance frameworks: ${frameworkNames}
Write the ENTIRE response (all narrative text) in the organization's primary language (${compliance.primaryLanguage}), using the local terminology guidance above where applicable. JSON keys stay in English; string values must be in ${compliance.primaryLanguage}.
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
}. Frameworks MUST be exactly: ${frameworkNames}. Provide 3-5 items in each findings list where possible. All wording must stay strictly advisory (e.g. "Compliance recommendation", "Potential gap", "Requires review", "Recommended action") — never an absolute legal compliance claim. JSON only, no prose.`;

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

    // --- Recommendation & learning-intelligence layer -------------------
    // Real signals from the workspace (recurring open questions, per-person
    // learning friction, structural KB counters) turned into concrete actions:
    // missing SOP, missing FAQ, a course to build, a course to assign with
    // per-person settings. Deterministic — no AI call, works fully offline.
    let intelligence: unknown = null;
    try {
      const { buildAuditRecommendations } = await import("@/lib/audit-recommendations");
      const auditRepo = getAiAuditRepository(context.supabase);
      const [gapRows, learnerRows, knowledgeRow] = await Promise.all([
        auditRepo.gapClusters(companyId, 40),
        auditRepo.learnerSignals(companyId, 50),
        auditRepo.knowledgeSignal(companyId),
      ]);
      intelligence = buildAuditRecommendations({
        gaps: gapRows,
        learners: learnerRows,
        knowledge: knowledgeRow,
        frameworkKeys: compliance?.frameworkKeys,
      });
      const intel = intelligence as {
        recommendations: unknown[];
        frictionIndex: number;
        selfServiceRate: number;
        topFrictionDepartments: unknown[];
        learnerCoaching: unknown[];
      };
      report.recommendations = intel.recommendations;
      report.learningIntelligence = {
        frictionIndex: intel.frictionIndex,
        selfServiceRate: intel.selfServiceRate,
        topFrictionDepartments: intel.topFrictionDepartments,
        learnerCoaching: intel.learnerCoaching,
      };
    } catch {
      report.recommendations = [];
    }

    const row = await getAiAuditRepository(context.supabase).create({ companyId, requestedBy: context.userId,
      score, maturity:String(rpt.maturityName||ml.name).toLowerCase().replace(" ","_"),summary:JSON.parse(JSON.stringify(report)) as JsonLike,
      passed:passedN,warnings:warnN,critical:critN });

    return { id: row.id, score, report };
  });

/**
 * Recommendations + learning intelligence without writing a new audit row.
 * Used by the AI Audit page to refresh advice between full runs.
 */
export const getAuditRecommendations = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: uuidString().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const companyId = await resolveCompany(context, data.company_id);
    const { buildAuditRecommendations } = await import("@/lib/audit-recommendations");
    const auditRepo = getAiAuditRepository(context.supabase);
    const [gaps, learners, knowledge] = await Promise.all([
      auditRepo.gapClusters(companyId, 40),
      auditRepo.learnerSignals(companyId, 50),
      auditRepo.knowledgeSignal(companyId),
    ]);
    const complianceCtx = await loadComplianceContext(context.supabase, companyId);
    return buildAuditRecommendations({
      gaps,
      learners,
      knowledge,
      frameworkKeys: complianceCtx?.frameworkKeys,
    });
  });


export const listAiAudits = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: uuidString().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const companyId = await resolveCompany(context, data.company_id);
    const audits = await getAiAuditRepository(context.supabase).list(companyId, 50);
    return { audits: audits.map((a)=>({...a,created_at:a.createdAt})) };
  });

// ---------------------------------------------------------------------------
// Phase 5 — Chat voice + vision
// ---------------------------------------------------------------------------

const CHAT_IMAGES_BUCKET = "chat-images";

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Wrap capability/provider failures into one clear, non-leaking message. */
function actionableAiError(action: string, error: unknown): Error {
  if (error instanceof AiCapabilityError) {
    return new Error(error.message);
  }
  console.error(`[ai-features:${action}]`, error);
  return new Error(
    `${action} failed on the active AI engine (${activeAiProviderLabel()}). Please try again or contact your administrator.`,
  );
}

const TranscribeInput = z.object({
  audio_base64: z.string().min(1),
  mime_type: z.string().min(1).default("audio/webm"),
  filename: z.string().optional().default("voice-note.webm"),
});

/** Speech → text for the chat composer's mic button. Degrades with a clear error when unsupported. */
export const transcribeVoiceInput = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => TranscribeInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "chat.use");
    if (!hasAiCapability("audioInput")) {
      throw new Error(
        "Voice input is not available on the active AI engine. Ask your administrator to enable a speech-to-text capable engine.",
      );
    }
    try {
      const bytes = b64ToBytes(data.audio_base64);
      const text = await transcribeAudio(bytes, data.mime_type, data.filename);
      return { text };
    } catch (error) {
      throw actionableAiError("Voice transcription", error);
    }
  });

const SynthesizeInput = z.object({
  text: z.string().min(1).max(4000),
});

/** Text → speech for spoken replies. Degrades with a clear error when unsupported. */
export const synthesizeVoiceReply = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SynthesizeInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "chat.use");
    if (!hasAiCapability("textToSpeech")) {
      throw new Error(
        "Spoken replies are not available on the active AI engine. Ask your administrator to enable a text-to-speech capable engine.",
      );
    }
    try {
      const { bytes, contentType } = await synthesizeSpeech(data.text);
      return { audio_base64: bytesToB64(bytes), content_type: contentType };
    } catch (error) {
      throw actionableAiError("Voice synthesis", error);
    }
  });

const UploadImageInput = z.object({
  filename: z.string().min(1),
  content_type: z.string().min(1),
  data_base64: z.string().min(1),
});

/** Store a chat-attached image under `<userId>/<uuid>-<name>` in the chat-images bucket. */
export const uploadChatImage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => UploadImageInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "chat.use");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const key = `${context.userId}/${crypto.randomUUID()}-${safe}`;
    const bytes = b64ToBytes(data.data_base64);
    if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("Image is too large (15 MB max).");
    await getStorageProvider().put({
      bucket: CHAT_IMAGES_BUCKET,
      key,
      body: bytes,
      contentType: data.content_type,
    });
    return { path: key };
  });

const SignImageInput = z.object({ path: z.string().min(1) });

/**
 * Materialize a chat image as an inline data URL for display/model input.
 * "Short-lived" because it is generated fresh per request and never persisted
 * as a public URL — the storage provider stays private end to end. Only the
 * owning user (path is scoped `<userId>/...`) may resolve their own images.
 */
export const signChatImage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SignImageInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePerm(context, "chat.use");
    const owner = data.path.split("/")[0];
    if (owner !== context.userId) throw new Error("Not authorized to access this image");
    const bytes = await getStorageProvider().get(CHAT_IMAGES_BUCKET, data.path);
    const head = await getStorageProvider().head(CHAT_IMAGES_BUCKET, data.path);
    return {
      data_base64: bytesToB64(bytes),
      content_type: head?.contentType ?? "image/png",
    };
  });
