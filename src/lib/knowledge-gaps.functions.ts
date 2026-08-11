import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/authorization";
import { uuidString } from "@/lib/zod-uuid";

/**
 * Knowledge gaps are repository-backed so Self-Hosted reads the local
 * PostgreSQL schema and Cloud reads Supabase — no data client in this module.
 */
async function gapContext(context: unknown) {
  const [{ resolveDashboardCompany }, { getKnowledgeGapRepository }] = await Promise.all([
    import("@/lib/dashboard-search.server"),
    import("@/lib/providers/registry"),
  ]);
  const ctx = context as { supabase: unknown; userId: string };
  const { companyId } = await resolveDashboardCompany(ctx as never, null);
  return { companyId, repo: getKnowledgeGapRepository(ctx.supabase) };
}

export const listKnowledgeGaps = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { companyId, repo } = await gapContext(context);
    return { gaps: await repo.list(companyId, 500) };
  });

export const updateKnowledgeGap = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuidString(),
        status: z.enum(["open", "in_progress", "resolved", "ignored"]).optional(),
        assignee_id: uuidString().nullable().optional(),
        resolution: z.enum(["sop", "faq", "dismissed"]).nullable().optional(),
        resolved_document_id: uuidString().nullable().optional(),
        resolved_faq_id: uuidString().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "analytics.view"]);
    const { companyId, repo } = await gapContext(context);
    const { id, ...patch } = data;
    await repo.update(companyId, id, {
      ...patch,
      ...(patch.status === "resolved" ? { resolution_date: new Date().toISOString() } : {}),
    });
    return { ok: true };
  });

export const deleteKnowledgeGap = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "analytics.view"]);
    const { companyId, repo } = await gapContext(context);
    await repo.remove(companyId, data.id);
    return { ok: true };
  });

export const getKnowledgeGapStats = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { companyId, repo } = await gapContext(context);
    const { buildKnowledgeGapStats } = await import("@/lib/knowledge-gap-stats");
    return buildKnowledgeGapStats(await repo.list(companyId, 2000));
  });
