/**
 * Platform-agnostic dashboard scope + global search helpers.
 *
 * Lives outside `dashboard.functions.ts` so that file stays a thin
 * server-function wrapper (server-fn splitting removes runtime siblings).
 *
 * Self-Hosted must never touch the Cloud data client: the company fallback and
 * the search itself run through the provider repositories, which are backed by
 * local PostgreSQL in Self-Hosted and by Supabase in Cloud.
 */
import { getActorRoles, getProfileCompany, requirePermission } from "@/lib/authorization";
import {
  getCompanyRepository,
  getFaqRepository,
  getKnowledgeRepository,
} from "@/lib/providers/registry";

type Ctx = { supabase: unknown; userId: string };

export type GlobalSearchHit = {
  kind: "document" | "faq";
  id: string;
  title: string;
  subtitle: string | null;
  category: string | null;
};

/**
 * Resolve the company a dashboard read is scoped to. Uses repositories only,
 * so it is safe in Self-Hosted where `context.supabase` is an inert
 * "no Supabase here" proxy.
 */
export async function resolveDashboardCompany(ctx: Ctx, hint?: string | null) {
  await requirePermission(ctx, "dashboard.view");
  const actor = await getActorRoles(ctx.supabase, ctx.userId);
  const isPlatform = actor.isPlatformAdmin;
  let companyId = hint ?? null;
  if (!companyId || !isPlatform) {
    companyId = (await getProfileCompany(ctx.supabase, ctx.userId)) ?? companyId;
  }
  if (!companyId && isPlatform) {
    const first = await getCompanyRepository(ctx.supabase).findFirstActive();
    companyId = first?.id ?? null;
  }
  if (!companyId) throw new Error("No company");
  return { companyId, isPlatform };
}

function matches(haystack: Array<string | null | undefined>, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  return haystack.some((h) => (h ?? "").toLowerCase().includes(needle));
}

/**
 * Repository-backed "search everywhere" over knowledge documents and FAQs.
 * Simple case-insensitive substring matching — deterministic, no RPC, and
 * identical behaviour on both products.
 */
export async function searchEverywhere(
  ctx: Ctx,
  companyId: string,
  q: string,
  limit = 8,
): Promise<GlobalSearchHit[]> {
  const [docs, faqs] = await Promise.all([
    getKnowledgeRepository(ctx.supabase)
      .listDocuments(companyId, false)
      .catch(() => []),
    getFaqRepository(ctx.supabase)
      .list(companyId)
      .catch(() => []),
  ]);

  const hits: GlobalSearchHit[] = [];
  for (const d of docs) {
    if (hits.length >= limit) break;
    if (!matches([d.title, d.doc_code, d.category], q)) continue;
    hits.push({
      kind: "document",
      id: d.id,
      title: d.title ?? d.doc_code ?? "Document",
      subtitle: d.doc_code ?? null,
      category: d.category ?? null,
    });
  }
  for (const f of faqs) {
    if (hits.length >= limit) break;
    if (!matches([f.question_en, f.question_de, f.answer_en, f.answer_de, f.category], q)) continue;
    hits.push({
      kind: "faq",
      id: f.id,
      title: f.question_en || f.question_de || "FAQ",
      subtitle: f.category ?? null,
      category: f.category ?? null,
    });
  }
  return hits.slice(0, limit);
}
