// Transport overview: fleet counts, expiry alerts, open work and audit state.
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarCheck,
  FileWarning,
  Handshake,
  Inbox,
  Truck,
  UsersRound,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import type { transportUi } from "@/i18n/pages/transport";
import type { TransportOverview } from "@/lib/transport/types";
import { useCsvExport } from "./use-transport";

type Ui = ReturnType<typeof transportUi>;

const LEVEL_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  expired: "destructive",
  critical: "destructive",
  warning: "secondary",
  watch: "outline",
};

export function OverviewSection({ t, data }: { t: Ui; data: TransportOverview }) {
  const exportCsv = useCsvExport();
  const c = data.counts;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Truck} label={t.vehicles} value={String(c.vehicles)} />
        <StatCard icon={UsersRound} label={t.drivers} value={String(c.drivers)} />
        <StatCard icon={Handshake} label={t.carriers} value={String(c.carriers)} />
        <StatCard icon={FileWarning} label={t.documents} value={String(c.documents)} />
        <StatCard icon={AlertTriangle} label={t.openIncidents} value={String(c.openIncidents)} />
        <StatCard icon={Inbox} label={t.openRequests} value={String(c.openRequests)} />
        <StatCard icon={Inbox} label={t.pendingApprovals} value={String(c.pendingApprovals)} />
        <StatCard
          icon={CalendarCheck}
          label={t.lastAudit}
          value={data.lastCheck ? data.lastCheck.period_start : "—"}
        />
      </div>

      <Panel
        icon={FileWarning}
        title={t.expiring}
        description={t.expiringBody}
        actions={
          data.grants.includes("export") ? (
            <Button size="sm" variant="outline" onClick={() => void exportCsv("alerts")}>
              {t.export}
            </Button>
          ) : null
        }
      >
        {data.alerts.length === 0 ? (
          <EmptyState title={t.none} description={t.expiringBody} />
        ) : (
          <ul className="divide-y divide-border">
            {data.alerts.map((a) => (
              <li
                key={a.documentId}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {a.ownerLabel} — {a.docLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.expiresOn} · {a.daysLeft} {t.daysLeft}
                  </p>
                </div>
                <Badge variant={LEVEL_VARIANT[a.level] ?? "outline"}>
                  {a.level === "expired"
                    ? t.expired
                    : a.level === "critical"
                      ? t.critical
                      : a.level === "warning"
                        ? t.warning
                        : t.watch}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={AlertTriangle} title={t.recentIncidents}>
          {data.recentIncidents.length === 0 ? (
            <EmptyState title={t.none} />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentIncidents.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.category} · {i.status}
                    </p>
                  </div>
                  <Badge variant={i.severity === "critical" ? "destructive" : "outline"}>
                    {i.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={Inbox} title={t.openRequests}>
          {data.openRequests.length === 0 ? (
            <EmptyState title={t.none} />
          ) : (
            <ul className="divide-y divide-border">
              {data.openRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.kind} · {r.status}
                      {r.due_on ? ` · ${r.due_on}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">{r.priority}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel icon={CalendarCheck} title={t.audit} description={t.auditBody}>
        {data.lastCheck ? (
          <p className="text-sm text-muted-foreground">
            {data.lastCheck.period_start} · {data.lastCheck.status}
            {data.lastCheck.ran_by_name ? ` · ${data.lastCheck.ran_by_name}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noAudit}</p>
        )}
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <Link
              to="/app/products/transport/$workspace"
              params={{ workspace: "procedures" }}
            >
              {t.checklist}
            </Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}
