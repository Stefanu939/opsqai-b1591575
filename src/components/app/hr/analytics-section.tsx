// OPSQAI HR — analytics and derived alerts (no invented numbers).
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BarChart3, Bell, Download } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { exportHrAnalyticsPdf } from "@/lib/hr-ext.functions";
import { downloadBase64 } from "@/components/app/transport/download";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import { useHrAnalytics } from "./use-hr-ext";

function Bars({ rows, empty }: { rows: Array<{ label: string; value: number }>; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate">{r.label}</span>
            <span className="font-medium">{r.value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.round((r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HrAnalyticsSection({ t }: { t: HrExtUi }) {
  const query = useHrAnalytics();
  const exportPdf = useServerFn(exportHrAnalyticsPdf);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.analytics} description={(query.error as Error).message} />;
  }
  const { analytics: a, alerts, grants } = query.data!;
  const kpis = [
    { label: t.averageTenure, value: a.averageTenureMonths },
    { label: t.turnover, value: `${a.turnover12m}%` },
    { label: t.incidents12m, value: a.incidents12m },
    { label: t.equipmentAssigned, value: a.assetsAssigned },
    { label: t.equipmentAvailable, value: a.assetsAvailable },
  ];
  const levelLabel = (l: string) => (l === "critical" ? t.critical : l === "warning" ? t.warn : t.info);

  return (
    <div className="grid gap-6">
      <Panel
        icon={BarChart3}
        title={t.analytics}
        actions={
          grants.includes("export" as never) ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void exportPdf()
                  .then((r) => downloadBase64(r.base64, r.filename, r.mime))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <Download className="mr-1.5 size-4" /> {t.reportPdf}
            </Button>
          ) : null
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-xl font-semibold">{k.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t.headcountByDepartment}</p>
            <Bars rows={a.headcountByDepartment} empty={t.none} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t.contractsByType}</p>
            <Bars rows={a.contractsByType} empty={t.none} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t.hiresByMonth}</p>
            <Bars rows={a.hiresByMonth} empty={t.none} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t.exitsByMonth}</p>
            <Bars rows={a.exitsByMonth} empty={t.none} />
          </div>
        </div>
      </Panel>

      <Panel icon={Bell} title={t.alerts}>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noAlerts}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {alerts.map((al) => (
              <li key={al.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <Badge
                  variant={
                    al.level === "critical"
                      ? "destructive"
                      : al.level === "warning"
                        ? "default"
                        : "outline"
                  }
                >
                  {levelLabel(al.level)}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{al.title}</span>
                <span className="text-xs text-muted-foreground">{al.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
