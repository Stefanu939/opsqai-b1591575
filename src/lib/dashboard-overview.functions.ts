import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";

/**
 * Lightweight overview counts + display info for the Self-Hosted dashboard
 * empty state. Uses the actor-scoped supabase client (RLS applies); no
 * admin privileges required.
 */
export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;

    const safeCount = async (table: string): Promise<number> => {
      try {
        const r = await sb.from(table).select("id", { count: "exact", head: true });
        return r.count ?? 0;
      } catch {
        return 0;
      }
    };

    const [documents, users, departments] = await Promise.all([
      safeCount("knowledge_documents"),
      safeCount("profiles"),
      safeCount("departments"),
    ]);

    let displayName = "";
    let companyName = "";
    try {
      const p = await sb
        .from("profiles")
        .select("full_name, company_id")
        .eq("user_id", context.userId)
        .maybeSingle();
      displayName = p.data?.full_name ?? "";
      const cid = p.data?.company_id;
      if (cid) {
        const c = await sb.from("companies").select("name").eq("id", cid).maybeSingle();
        companyName = c.data?.name ?? "";
      }
    } catch {
      /* non-fatal */
    }

    return {
      documents,
      users,
      departments,
      displayName,
      companyName,
      isEmpty: documents === 0 && users <= 1 && departments === 0,
    };
  });
