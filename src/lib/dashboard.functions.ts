import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";

/**
 * Lightweight overview counts for the Self-Hosted dashboard empty state.
 * All queries scope naturally under the caller's RLS / actor company —
 * no admin privileges required.
 */
export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as {
      from: (t: string) => {
        select: (c: string, o?: { count?: "exact"; head?: boolean }) => Promise<{
          count: number | null;
          error: unknown;
        }> & {
          eq: (
            k: string,
            v: string,
          ) => Promise<{ count: number | null; error: unknown }>;
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };

    const safeCount = async (
      p: Promise<{ count: number | null; error: unknown }>,
    ): Promise<number> => {
      try {
        const r = await p;
        return r.count ?? 0;
      } catch {
        return 0;
      }
    };

    const [documents, users, departments] = await Promise.all([
      safeCount(
        sb
          .from("knowledge_documents")
          .select("id", { count: "exact", head: true }) as unknown as Promise<{
          count: number | null;
          error: unknown;
        }>,
      ),
      safeCount(
        sb.from("profiles").select("id", { count: "exact", head: true }) as unknown as Promise<{
          count: number | null;
          error: unknown;
        }>,
      ),
      safeCount(
        sb
          .from("departments")
          .select("id", { count: "exact", head: true }) as unknown as Promise<{
          count: number | null;
          error: unknown;
        }>,
      ),
    ]);

    // Fetch caller display name (best-effort; empty on failure).
    let displayName = "";
    let companyName = "";
    try {
      const profile = (await (sb.from("profiles") as unknown as {
        select: (c: string) => {
          eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      })
        .select("full_name, company_id")
        .eq("user_id", context.userId)
        .maybeSingle()) as { data: { full_name?: string; company_id?: string } | null };
      displayName = profile.data?.full_name ?? "";
      const companyId = profile.data?.company_id;
      if (companyId) {
        const company = (await (sb.from("companies") as unknown as {
          select: (c: string) => {
            eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
          };
        })
          .select("name")
          .eq("id", companyId)
          .maybeSingle()) as { data: { name?: string } | null };
        companyName = company.data?.name ?? "";
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
