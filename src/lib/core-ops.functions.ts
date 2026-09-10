// OPSQAI Core — Operational Intelligence server functions (Self-Hosted).
//
// Incidents / damages, their relations to SOPs and FAQs, grounded root-cause
// analysis (5 Why + Lean) and corrective / preventive actions. Every handler
// resolves the caller's company and department itself: department isolation is
// enforced here, never in the browser. Financial values require the dedicated
// "costs" right.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString() } from "@/lib/zod-uuid";
import { getProfileRepository } from "@/lib/providers/registry";
import {
  CORE_OPS_GRANTS,
  INCIDENT_KINDS,
  INCIDENT_STATUSES,
  type CoreAction,
  type CoreAnalytics,
  type CoreIncident,
  type CoreIncidentDetail,
  type CoreOpsGrantKey,
  type CoreRootCause,
  type CoreSourceRef,
  type CoreWhyStep,
} from "@/lib/core-ops/types";

type Ctx = { supabase: unknown; userId: string; claims?: { email?: string } };

interface Actor {
  userId: string;
  companyId: string;
  name: string;
  /** null = sees every department. */
  departmentId: string | null;
  grants: CoreOpsGrantKey[];
}

async function actor(context: Ctx): Promise<Actor> {
  const profile = await getProfileRepository(context.supabase).findByUserId(context.userId);
  const companyId = profile?.companyId ?? null;
  if (!companyId) throw new Error("No workspace is linked to this account.");

  const { getActorRoles } = await import("@/lib/authorization");
  const roles = await getActorRoles(context.supabase, context.userId);
  const isUnrestricted =
    roles.isPlatformOwner ||
    roles.isPlatformAdmin ||
    roles.roles.includes("superadmin") ||
    roles.roles.includes("workspace_owner") ||
    roles.roles.includes("admin");
  const isManager =
    isUnrestricted || roles.roles.includes("manager") || roles.roles.includes("team_leader");

  const rights = await import("@/lib/providers/registry").then(
    ({ getAreaRightsRepository, hasAreaRightsRepository }) =>
      hasAreaRightsRepository()
        ? getAreaRightsRepository(context.supabase).listForUser(companyId, context.userId)
        : Promise.resolve([]),
  );
  const ops = rights.filter((r) => r.areaKey === "core_ops" && r.granted);
  const costs = rights.some((r) => r.areaKey === "core_costs" && r.granted && r.action === "view");

  const mapped = ops.flatMap((r): CoreOpsGrantKey[] => {
    switch (r.action) {
      case "view":
        return ["view"];
      case "create":
        return ["create", "analyse"];
      case "edit":
        return ["edit", "analyse", "export"];
      case "delete":
        return ["delete"];
      case "administer":
        return ["settings", "export", "costs"];
      default:
        return [];
    }
  });

  const grants: CoreOpsGrantKey[] = isUnrestricted
    ? [...CORE_OPS_GRANTS]
    : Array.from(
        new Set<CoreOpsGrantKey>([
          "view",
          ...mapped,
          ...(costs ? (["costs"] as CoreOpsGrantKey[]) : []),
          ...(isManager ? (["analyse", "create", "edit", "export"] as CoreOpsGrantKey[]) : []),
        ]),
      );

  return {
    userId: context.userId,
    companyId,
    name:
      (profile as { fullName?: string } | null)?.fullName || context.claims?.email || "User",
    departmentId: isManager ? null : ((profile?.departmentId as string | null) ?? null),
    grants,
  };
}

function need(a: Actor, grant: CoreOpsGrantKey): void {
  if (!a.grants.includes(grant)) {
    throw new Error(`Forbidden: this account has no Operations "${grant}" right.`);
  }
}

/** Financial values are stripped for accounts without the costs right. */
function maskCosts<T extends { cost_amount: number; frequency_per_month: number }>(
  a: Actor,
  rows: T[],
): T[] {
  if (a.grants.includes("costs")) return rows;
  return rows.map((row) => ({ ...row, cost_amount: 0 }));
}

const kindEnum = z.enum(INCIDENT_KINDS);
const statusEnum = z.enum(INCIDENT_STATUSES);

// ── Reads ─────────────────────────────────────────────────────────────────

export const getCoreOpsBoard = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        departmentId: uuidString().nullish(),
        kind: kindEnum.nullish(),
        status: statusEnum.nullish(),
        from: z.string().min(4).nullish(),
        to: z.string().min(4).nullish(),
        search: z.string().max(120).nullish(),
      })
      .parse(input ?? {}),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      incidents: CoreIncident[];
      analytics: CoreAnalytics;
      openActions: Array<CoreAction & { incident_title: string; incident_ref: string | null }>;
      departments: Array<{ id: string; name: string }>;
      grants: CoreOpsGrantKey[];
      scopedToDepartment: boolean;
    }> => {
      const a = await actor(context as Ctx);
      need(a, "view");
      const db = await import("@/lib/core-ops/db.server");
      const scope = { companyId: a.companyId, departmentId: a.departmentId };
      const [incidents, stats, openActions, departments] = await Promise.all([
        db.listIncidents(scope, data),
        db.analytics(scope),
        db.listOpenActions(scope),
        db.listDepartments(a.companyId),
      ]);
      const costs = a.grants.includes("costs");
      return {
        incidents: maskCosts(a, incidents),
        analytics: costs
          ? stats
          : {
              ...stats,
              totals: { ...stats.totals, cost: 0, annualImpact: 0 },
              byDepartment: stats.byDepartment.map((r) => ({ ...r, cost: 0 })),
              byKind: stats.byKind.map((r) => ({ ...r, cost: 0 })),
              topRootCauses: stats.topRootCauses.map((r) => ({ ...r, cost: 0 })),
              trend: stats.trend.map((r) => ({ ...r, cost: 0 })),
            },
        openActions,
        departments,
        grants: a.grants,
        scopedToDepartment: a.departmentId !== null,
      };
    },
  );

export const getCoreIncident = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }): Promise<CoreIncidentDetail & { grants: CoreOpsGrantKey[] }> => {
    const a = await actor(context as Ctx);
    need(a, "view");
    const db = await import("@/lib/core-ops/db.server");
    const detail = await db.getIncidentDetail(
      { companyId: a.companyId, departmentId: a.departmentId },
      data.id,
    );
    const [incident] = maskCosts(a, [detail.incident]);
    return {
      ...detail,
      incident: incident!,
      rootCause:
        detail.rootCause && !a.grants.includes("costs")
          ? { ...detail.rootCause, financial_impact: 0 }
          : detail.rootCause,
      grants: a.grants,
    };
  });

// ── Writes ────────────────────────────────────────────────────────────────

export const saveCoreIncident = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuidString().nullish(),
        kind: kindEnum,
        title: z.string().min(3).max(200),
        description: z.string().max(6000).nullish(),
        occurred_at: z.string().min(4),
        department_id: uuidString().nullish(),
        location: z.string().max(160).nullish(),
        cost_amount: z.number().min(0).max(100_000_000).optional(),
        currency: z.string().min(3).max(3).optional(),
        lost_minutes: z.number().int().min(0).max(1_000_000).optional(),
        frequency_per_month: z.number().min(0).max(1000).optional(),
        status: statusEnum.optional(),
        involved_person: z.string().max(160).nullish(),
        involved_role: z.string().max(160).nullish(),
        immediate_cause: z.string().max(2000).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const a = await actor(context as Ctx);
    need(a, data.id ? "edit" : "create");
    const db = await import("@/lib/core-ops/db.server");
    const payload = { ...data };
    if (!a.grants.includes("costs")) delete payload.cost_amount;
    if (a.departmentId && !payload.department_id) payload.department_id = a.departmentId;
    const saved = await db.saveIncident(
      { companyId: a.companyId, departmentId: a.departmentId },
      a.userId,
      payload,
    );
    await audit(context as Ctx, a, data.id ? "core.incident.update" : "core.incident.create", saved.id);
    return saved;
  });

export const deleteCoreIncident = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const a = await actor(context as Ctx);
    need(a, "delete");
    const db = await import("@/lib/core-ops/db.server");
    await db.getIncidentDetail({ companyId: a.companyId, departmentId: a.departmentId }, data.id);
    await db.deleteIncident({ companyId: a.companyId, departmentId: a.departmentId }, data.id);
    await audit(context as Ctx, a, "core.incident.delete", data.id);
    return { ok: true };
  });

export const searchCoreLinkTargets = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ term: z.string().min(2).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const a = await actor(context as Ctx);
    need(a, "view");
    const db = await import("@/lib/core-ops/db.server");
    return db.searchLinkTargets(a.companyId, data.term);
  });

export const saveCoreIncidentLink = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        incidentId: uuidString(),
        link_type: z.enum(["violated_sop", "related_sop", "faq", "incident"]),
        target_id: uuidString().nullish(),
        target_title: z.string().max(300).nullish(),
        note: z.string().max(1000).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const a = await actor(context as Ctx);
    need(a, "edit");
    const db = await import("@/lib/core-ops/db.server");
    await db.getIncidentDetail(
      { companyId: a.companyId, departmentId: a.departmentId },
      data.incidentId,
    );
    await db.addLink(data.incidentId, data);
    return { ok: true };
  });

export const deleteCoreIncidentLink = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ incidentId: uuidString(), id: uuidString() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const a = await actor(context as Ctx);
    need(a, "edit");
    const db = await import("@/lib/core-ops/db.server");
    await db.getIncidentDetail(
      { companyId: a.companyId, departmentId: a.departmentId },
      data.incidentId,
    );
    await db.removeLink(data.incidentId, data.id);
    return { ok: true };
  });

const MAX_ATTACHMENT = 8 * 1024 * 1024;

export const uploadCoreIncidentEvidence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        incidentId: uuidString(),
        filename: z.string().min(1).max(200),
        mimeType: z.string().min(3).max(120),
        base64: z.string().min(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const a = await actor(context as Ctx);
    need(a, "edit");
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_ATTACHMENT) throw new Error("Evidence file exceeds 8 MB.");
    if (!/^(image\/(png|jpe?g|webp|gif)|application\/pdf)$/.test(data.mimeType)) {
      throw new Error("Only images and PDF files can be attached.");
    }
    const db = await import("@/lib/core-ops/db.server");
    await db.getIncidentDetail(
      { companyId: a.companyId, departmentId: a.departmentId },
      data.incidentId,
    );
    return db.addAttachment(data.incidentId, a.userId, {
      filename: data.filename,
      mime_type: data.mimeType,
      data: new Uint8Array(bytes),
    });
  });

export const downloadCoreIncidentEvidence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(
    async ({ data, context }): Promise<{ filename: string; mimeType: string; base64: string }> => {
      const a = await actor(context as Ctx);
      need(a, "view");
      const db = await import("@/lib/core-ops/db.server");
      const file = await db.getAttachment(a.companyId, data.id);
      if (!file) throw new Error("attachment_not_found");
      return {
        filename: file.filename,
        mimeType: file.mime_type,
        base64: Buffer.from(file.data).toString("base64"),
      };
    },
  );

export const deleteCoreIncidentEvidence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const a = await actor(context as Ctx);
    need(a, "edit");
    const db = await import("@/lib/core-ops/db.server");
    await db.removeAttachment(a.companyId, data.id);
    return { ok: true };
  });

// ── Root cause intelligence ───────────────────────────────────────────────

const whyStep = z.object({
  question: z.string().max(400),
  answer: z.string().max(2000),
  supported: z.boolean().optional(),
});

export const saveCoreRootCause = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        incidentId: uuidString(),
        problem: z.string().max(2000).nullish(),
        immediate_cause: z.string().max(2000).nullish(),
        root_cause: z.string().max(2000).nullish(),
        sop_violation: z.string().max(2000).nullish(),
        process_failure: z.string().max(2000).nullish(),
        related_processes: z.string().max(2000).nullish(),
        financial_impact: z.number().min(0).max(100_000_000).optional(),
        frequency: z.number().min(0).max(10_000).optional(),
        why_steps: z.array(whyStep).max(10).optional(),
        lean_class: z.string().max(80).nullish(),
        corrective: z.string().max(4000).nullish(),
        preventive: z.string().max(4000).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const a = await actor(context as Ctx);
    need(a, "analyse");
    const db = await import("@/lib/core-ops/db.server");
    const detail = await db.getIncidentDetail(
      { companyId: a.companyId, departmentId: a.departmentId },
      data.incidentId,
    );
    await db.saveRootCause(data.incidentId, a.userId, {
      ...detail.rootCause,
      ...data,
      why_steps: (data.why_steps ?? detail.rootCause?.why_steps ?? []).map((s) => ({
        question: s.question,
        answer: s.answer,
        supported: s.supported ?? false,
      })) as CoreWhyStep[],
      sources: detail.rootCause?.sources ?? [],
      unsupported: detail.rootCause?.unsupported ?? [],
      generated: false,
    });
    await audit(context as Ctx, a, "core.rootcause.update", data.incidentId);
    return { ok: true };
  });

/**
 * Grounded root-cause proposal. The model only sees the incident record and
 * chunks retrieved from this company's knowledge base. Anything it cannot
 * support is returned as an explicit UNKNOWN line instead of a guess.
 */
export const generateCoreRootCause = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ incidentId: uuidString(), language: z.enum(["en", "de", "ro"]).optional() })
      .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ rootCause: CoreRootCause | null; grounded: boolean; message?: string }> => {
      const a = await actor(context as Ctx);
      need(a, "analyse");
      const db = await import("@/lib/core-ops/db.server");
      const scope = { companyId: a.companyId, departmentId: a.departmentId };
      const detail = await db.getIncidentDetail(scope, data.incidentId);
      const language = data.language ?? "en";

      const { getKnowledgeRepository, getFaqRepository } = await import("@/lib/providers/registry");
      const { embedOne } = await import("@/lib/embeddings.server");
      const question = [
        detail.incident.title,
        detail.incident.description ?? "",
        detail.incident.immediate_cause ?? "",
        detail.links.map((l) => l.target_title ?? "").join(" "),
      ]
        .filter(Boolean)
        .join(" \n ");

      const sources: CoreSourceRef[] = [];
      let contextText = "";
      try {
        const embedding = await embedOne(question);
        const matches = await getKnowledgeRepository(context.supabase).searchSimilar(
          a.companyId,
          embedding,
          10,
        );
        const strong = matches.filter((m) => Number(m.similarity ?? 0) >= 0.28);
        const docs = await getKnowledgeRepository(context.supabase).getDocumentsByIds(
          Array.from(new Set(strong.map((m) => m.document_id))),
        );
        const visible = new Map(
          docs
            .filter(
              (d) =>
                !a.departmentId ||
                !(d as { departmentId?: string | null }).departmentId ||
                (d as { departmentId?: string | null }).departmentId === a.departmentId,
            )
            .map((d) => [d.id, d]),
        );
        const usable = strong.filter((m) => visible.has(m.document_id));
        contextText = usable
          .map((m, i) => {
            const doc = visible.get(m.document_id)!;
            sources.push({ type: "document", id: m.document_id, title: doc.title });
            return `[Document ${i + 1}] ${doc.title}\n${m.content}`;
          })
          .join("\n\n---\n\n");
        if (!contextText) {
          const faqs = await getFaqRepository(context.supabase).list(a.companyId);
          const words = question.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3);
          const hit = faqs
            .map((f) => ({
              f,
              score: words.reduce(
                (n, w) =>
                  n +
                  (f.question_en.toLowerCase().includes(w) || f.question_de.toLowerCase().includes(w)
                    ? 2
                    : 0),
                0,
              ),
            }))
            .filter((x) => x.score >= 4)
            .sort((x, y) => y.score - x.score)
            .slice(0, 3);
          contextText = hit
            .map(({ f }, i) => {
              sources.push({ type: "faq", id: f.id, title: f.question_en });
              return `[FAQ ${i + 1}] ${f.question_en}\n${f.answer_en}`;
            })
            .join("\n\n---\n\n");
        }
      } catch (error) {
        console.error("[core-ops:retrieval]", error);
      }

      if (!contextText) {
        // No grounding at all → record the gap instead of inventing a cause.
        try {
          const { recordKnowledgeGap } = await import("@/lib/knowledge-gap-auto.server");
          await recordKnowledgeGap(context.supabase, {
            companyId: a.companyId,
            userId: a.userId,
            question: `Root cause analysis: ${detail.incident.title}`,
            confidence: 0,
          } as never);
        } catch {
          /* the gap loop is best effort */
        }
        return {
          rootCause: null,
          grounded: false,
          message:
            "No published procedure or FAQ covers this incident, so no root cause was proposed. Publish the missing procedure and run the analysis again.",
        };
      }

      const { generateText } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-provider.server");
      const system = `You are an operations root-cause analyst for OPSQAI.
Use ONLY the company knowledge provided. Never invent procedures, rules, numbers, names or regulations.
When a step cannot be supported by the provided knowledge, write exactly "UNKNOWN" as its answer.
Answer in ${language === "de" ? "German" : language === "ro" ? "Romanian" : "English"}.
Return strict JSON only:
{"problem":"","immediate_cause":"","root_cause":"","sop_violation":"","process_failure":"","related_processes":"","lean_class":"","why_steps":[{"question":"","answer":""}],"corrective":"","preventive":"","unsupported":[""]}
"lean_class" must be one of: waste, variation, overburden, unclear_standard, missing_standard, training_gap, UNKNOWN.
"why_steps" must contain exactly 5 entries (Why 1..5).`;

      const prompt = `INCIDENT
Reference: ${detail.incident.ref ?? "—"}
Type: ${detail.incident.kind}
Title: ${detail.incident.title}
Description: ${detail.incident.description ?? "—"}
Immediate cause noted by the reporter: ${detail.incident.immediate_cause ?? "—"}
Department: ${detail.incident.department_name ?? "—"}
Frequency per month: ${detail.incident.frequency_per_month}
Linked procedures: ${detail.links.map((l) => `${l.link_type}: ${l.target_title ?? "—"}`).join("; ") || "none"}

COMPANY KNOWLEDGE
${contextText}

Produce the JSON analysis now.`;

      let parsed: Record<string, unknown> = {};
      try {
        const { text } = await generateText({
          model: resolveChatModel("chat"),
          temperature: 0.15,
          system,
          prompt,
        });
        const match = text.match(/\{[\s\S]*\}/);
        parsed = match ? (JSON.parse(match[0]) as Record<string, unknown>) : {};
      } catch (error) {
        console.error("[core-ops:llm]", error);
        throw new Error("The analysis could not be generated. Please try again.");
      }

      const str = (key: string) => {
        const value = String(parsed[key] ?? "").trim();
        return !value || value === "UNKNOWN" ? null : value;
      };
      const rawSteps = Array.isArray(parsed["why_steps"]) ? parsed["why_steps"] : [];
      const why_steps: CoreWhyStep[] = rawSteps.slice(0, 5).map((step, index) => {
        const s = (step ?? {}) as Record<string, unknown>;
        const answer = String(s["answer"] ?? "").trim();
        const supported = Boolean(answer) && answer !== "UNKNOWN";
        return {
          question: String(s["question"] ?? `Why ${index + 1}?`).slice(0, 400),
          answer: supported ? answer.slice(0, 2000) : "UNKNOWN",
          supported,
        };
      });
      const unsupported = [
        ...(Array.isArray(parsed["unsupported"])
          ? parsed["unsupported"].map((u) => String(u).slice(0, 300))
          : []),
        ...why_steps.filter((s) => !s.supported).map((s) => s.question),
      ].slice(0, 12);

      const { costOfIncident } = await import("@/lib/core-ops/types");
      await db.saveRootCause(data.incidentId, a.userId, {
        problem: str("problem") ?? detail.incident.title,
        immediate_cause: str("immediate_cause") ?? detail.incident.immediate_cause,
        root_cause: str("root_cause"),
        sop_violation: str("sop_violation"),
        process_failure: str("process_failure"),
        related_processes: str("related_processes"),
        financial_impact: costOfIncident(detail.incident),
        frequency: detail.incident.frequency_per_month,
        why_steps,
        lean_class: str("lean_class"),
        corrective: str("corrective"),
        preventive: str("preventive"),
        sources,
        unsupported,
        generated: true,
      });
      await audit(context as Ctx, a, "core.rootcause.generate", data.incidentId);

      const fresh = await db.getIncidentDetail(scope, data.incidentId);
      return {
        rootCause:
          fresh.rootCause && !a.grants.includes("costs")
            ? { ...fresh.rootCause, financial_impact: 0 }
            : fresh.rootCause,
        grounded: true,
      };
    },
  );

// ── Actions ───────────────────────────────────────────────────────────────

export const saveCoreAction = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        incidentId: uuidString(),
        id: uuidString().nullish(),
        kind: z.enum(["corrective", "preventive"]),
        title: z.string().min(3).max(200),
        detail: z.string().max(4000).nullish(),
        owner_name: z.string().max(160).nullish(),
        due_date: z.string().max(30).nullish(),
        status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const a = await actor(context as Ctx);
    need(a, "edit");
    const db = await import("@/lib/core-ops/db.server");
    await db.getIncidentDetail(
      { companyId: a.companyId, departmentId: a.departmentId },
      data.incidentId,
    );
    await db.saveAction(data.incidentId, a.userId, data);
    return { ok: true };
  });

export const deleteCoreAction = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ incidentId: uuidString(), id: uuidString() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const a = await actor(context as Ctx);
    need(a, "edit");
    const db = await import("@/lib/core-ops/db.server");
    await db.getIncidentDetail(
      { companyId: a.companyId, departmentId: a.departmentId },
      data.incidentId,
    );
    await db.deleteAction(data.incidentId, data.id);
    return { ok: true };
  });

// ── PDF exports (PDF only — no spreadsheet exports in Self-Hosted) ────────

export const exportCoreIncidentPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }): Promise<{ filename: string; base64: string }> => {
    const a = await actor(context as Ctx);
    need(a, "export");
    const db = await import("@/lib/core-ops/db.server");
    const detail = await db.getIncidentDetail(
      { companyId: a.companyId, departmentId: a.departmentId },
      data.id,
    );
    const { renderIncidentPdf } = await import("@/lib/core-ops/pdf.server");
    const base64 = await renderIncidentPdf(detail, { showCosts: a.grants.includes("costs") });
    return { filename: `${detail.incident.ref ?? "incident"}.pdf`, base64 };
  });

export const exportCoreAnalyticsPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<{ filename: string; base64: string }> => {
    const a = await actor(context as Ctx);
    need(a, "export");
    const db = await import("@/lib/core-ops/db.server");
    const scope = { companyId: a.companyId, departmentId: a.departmentId };
    const stats = await db.analytics(scope);
    const { renderAnalyticsPdf } = await import("@/lib/core-ops/pdf.server");
    const base64 = await renderAnalyticsPdf(stats, { showCosts: a.grants.includes("costs") });
    return { filename: `opsqai-operations-report.pdf`, base64 };
  });

// ── Audit trail ───────────────────────────────────────────────────────────

async function audit(context: Ctx, a: Actor, action: string, target: string): Promise<void> {
  try {
    const { getAuditRepository, hasAuditRepository } = await import("@/lib/providers/registry");
    if (!hasAuditRepository()) return;
    await getAuditRepository(context.supabase).write({
      actorId: a.userId,
      action,
      target,
      detail: { module: "core_operations", company_id: a.companyId },
    } as never);
  } catch {
    /* auditing never blocks the operation */
  }
}
