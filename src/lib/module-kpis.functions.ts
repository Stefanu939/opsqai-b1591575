// OPSQAI — dashboard module summaries (Self-Hosted).
//
// One cheap authenticated call returns a KPI strip per work module that is
// actually present in the installation database. Every block is guarded, so an
// install without Transport or HR simply contributes nothing instead of
// breaking the dashboard. The client only renders modules the licence enables.
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { getProfileRepository } from "@/lib/providers/registry";

export type ModuleKpi = { label: string; value: number; tone?: "critical" | "warning" };
export type ModuleSummary = { product: string; kpis: ModuleKpi[] };

export const getModuleKpis = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<{ modules: ModuleSummary[] }> => {
    const ctx = context as { supabase: unknown; userId: string };
    const profile = await getProfileRepository(ctx.supabase).findByUserId(ctx.userId);
    const companyId = profile?.companyId ?? null;
    if (!companyId) return { modules: [] };

    const modules: ModuleSummary[] = [];

    // Transport
    try {
      const db = await import("@/lib/transport/db.server");
      const [c, alerts] = await Promise.all([
        db.counts(companyId),
        db.expiryAlerts(companyId).catch(() => [] as Array<{ level?: string }>),
      ]);
      const expired = alerts.filter((a) => String(a.level) === "critical").length;
      modules.push({
        product: "opsqai_transport",
        kpis: [
          { label: "vehicles", value: c.vehicles },
          { label: "drivers", value: c.drivers },
          { label: "openIncidents", value: c.openIncidents, tone: c.openIncidents ? "warning" : undefined },
          { label: "expiring", value: alerts.length, tone: alerts.length ? "warning" : undefined },
          { label: "expired", value: expired, tone: expired ? "critical" : undefined },
        ],
      });
    } catch {
      /* module tables not installed */
    }

    // HR
    try {
      const db = await import("@/lib/hr/db.server");
      const [c, action] = await Promise.all([
        db.counts(companyId),
        db.actionRequired(companyId).catch(() => ({
          contractsExpiring: 0,
          openTasks: 0,
          overdueTasks: 0,
          missingData: 0,
        })),
      ]);
      modules.push({
        product: "opsqai_hr",
        kpis: [
          { label: "employees", value: c.total },
          { label: "onboarding", value: c.onboarding },
          { label: "openTasks", value: action.openTasks, tone: action.openTasks ? "warning" : undefined },
          {
            label: "overdueTasks",
            value: action.overdueTasks,
            tone: action.overdueTasks ? "critical" : undefined,
          },
          { label: "contractsExpiring", value: action.contractsExpiring, tone: action.contractsExpiring ? "warning" : undefined },
        ],
      });
    } catch {
      /* module tables not installed */
    }

    return { modules };
  });
