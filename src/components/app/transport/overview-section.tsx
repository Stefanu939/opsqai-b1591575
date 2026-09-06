// Transport overview: KPI cards with trend, period and register filters,
// action cards for what needs attention now, a mini-map and CSV exports.
import { useMemo, useState } from "react";
import { lazy, Suspense } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  FileWarning,
  Handshake,
  Inbox,
  MapPin as PinIcon,
  Truck,
  UsersRound,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { transportUi } from "@/i18n/pages/transport";
import type { TransportOverview, TransportTrend } from "@/lib/transport/types";
import { useCsvExport } from "./use-transport";
import { FleetBoard } from "./fleet-board";

const TransportMap = lazy(() => import("./transport-map"));

type Ui = ReturnType<typeof transportUi>;

const LEVEL_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  expired: "destructive",
  critical: "destructive",
  warning: "secondary",
  watch: "outline",
};

function trendLabel(t: Ui, trend: TransportTrend): string {
  const delta = trend.current - trend.previous;
  const word = delta > 0 ? t.trendUp : delta < 0 ? t.trendDown : t.trendFlat;
  return `${delta > 0 ? "+" : ""}${delta} · ${word}`;
}

export function OverviewSection({
  t,
  data,
  lang,
  periodDays,
  onPeriodChange,
}: {
  t: Ui;
  data: TransportOverview;
  lang: "en" | "de" | "ro";
  periodDays: number;
  onPeriodChange: (days: number) => void;
}) {
  const exportCsv = useCsvExport();
  const c = data.counts;

  const [depot, setDepot] = useState("all");
  const [carrier, setCarrier] = useState("all");
  const [severity, setSeverity] = useState("all");

  const depots = useMemo(() => {
    const set = new Set<string>();
    for (const v of data.vehicles) if (v.base_location) set.add(v.base_location);
    for (const d of data.drivers) if (d.base_location) set.add(d.base_location);
    return [...set].sort();
  }, [data.vehicles, data.drivers]);

  const vehicleIdsInDepot = useMemo(() => {
    if (depot === "all") return null;
    return new Set(
      data.vehicles.filter((v) => v.base_location === depot).map((v) => v.id),
    );
  }, [depot, data.vehicles]);

  const alerts = useMemo(() => {
    return data.alerts.filter((a) => {
      if (severity !== "all" && a.level !== severity) return false;
      if (vehicleIdsInDepot && a.ownerKind === "vehicle") {
        return vehicleIdsInDepot.has(a.ownerId);
      }
      if (carrier !== "all" && a.ownerKind === "carrier") return a.ownerId === carrier;
      return true;
    });
  }, [data.alerts, severity, vehicleIdsInDepot, carrier]);

  const incidents = useMemo(
    () =>
      data.recentIncidents.filter((i) => {
        if (severity !== "all" && i.severity !== severity) return false;
        if (carrier !== "all" && i.carrier_id !== carrier) return false;
        if (vehicleIdsInDepot && i.vehicle_id) {
          return vehicleIdsInDepot.has(i.vehicle_id);
        }
        return true;
      }),
    [data.recentIncidents, severity, carrier, vehicleIdsInDepot],
  );

  const today = new Date().toISOString().slice(0, 10);
  const overdueRequests = data.openRequests.filter(
    (r) => r.due_on != null && r.due_on < today,
  );
  const expired = data.alerts.filter((a) => a.level === "expired");
  const criticalIncidents = data.recentIncidents.filter(
    (i) => i.severity === "critical" && i.status !== "closed" && i.status !== "cancelled",
  );

  const pins = useMemo(() => {
    if (!vehicleIdsInDepot) return data.pins;
    return data.pins.filter(
      (p) => p.kind !== "vehicle" || vehicleIdsInDepot.has(p.id),
    );
  }, [data.pins, vehicleIdsInDepot]);

  return (
    <div className="grid gap-4">
      <FleetBoard t={t} data={data} lang={lang} periodDays={periodDays} />

      <Panel
        icon={CalendarCheck}
        title={t.filters}
        actions={
          <div className="flex flex-wrap gap-2">
            <Select
              value={String(periodDays)}
              onValueChange={(v) => onPeriodChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue placeholder={t.period} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t.last7}</SelectItem>
                <SelectItem value="30">{t.last30}</SelectItem>
                <SelectItem value="90">{t.last90}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={depot} onValueChange={setDepot}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder={t.depot} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{`${t.depot}: ${t.allValues}`}</SelectItem>
                {depots.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger className="h-8 w-44">
                <SelectValue placeholder={t.carrier} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{`${t.carrier}: ${t.allValues}`}</SelectItem>
                {data.carriers.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue placeholder={t.severity} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{`${t.severity}: ${t.allValues}`}</SelectItem>
                <SelectItem value="critical">{t.critical}</SelectItem>
                <SelectItem value="expired">{t.expired}</SelectItem>
                <SelectItem value="warning">{t.warning}</SelectItem>
                <SelectItem value="watch">{t.watch}</SelectItem>
              </SelectContent>
            </Select>
            {data.grants.includes("export") ? (
              <Button size="sm" variant="outline" onClick={() => void exportCsv("alerts")}>
                {t.export}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Truck} label={t.vehicles} value={String(c.vehicles)} />
          <StatCard icon={UsersRound} label={t.drivers} value={String(c.drivers)} />
          <StatCard icon={Handshake} label={t.carriers} value={String(c.carriers)} />
          <StatCard icon={FileWarning} label={t.documents} value={String(c.documents)} />
          <StatCard
            icon={AlertTriangle}
            label={`${t.openIncidents} · ${periodDays}d`}
            value={String(c.openIncidents)}
            hint={trendLabel(t, data.trends.incidents)}
          />
          <StatCard
            icon={Inbox}
            label={`${t.openRequests} · ${periodDays}d`}
            value={String(c.openRequests)}
            hint={trendLabel(t, data.trends.requests)}
          />
          <StatCard
            icon={Inbox}
            label={t.pendingApprovals}
            value={String(c.pendingApprovals)}
            hint={trendLabel(t, data.trends.approvals)}
          />
          <StatCard
            icon={CalendarCheck}
            label={t.auditScore}
            value={data.lastAudit ? `${data.lastAudit.score}/100` : "—"}
            hint={
              data.lastAudit
                ? new Date(data.lastAudit.created_at).toLocaleDateString()
                : t.noAudit
            }
          />
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel icon={FileWarning} title={t.actionsNeeded}>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center justify-between">
              <span>{t.expired}</span>
              <Badge variant={expired.length ? "destructive" : "outline"}>
                {expired.length}
              </Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>{t.critical}</span>
              <Badge variant={criticalIncidents.length ? "destructive" : "outline"}>
                {criticalIncidents.length}
              </Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>{t.dueOn}</span>
              <Badge variant={overdueRequests.length ? "secondary" : "outline"}>
                {overdueRequests.length}
              </Badge>
            </li>
          </ul>
        </Panel>

        <Panel icon={PinIcon} title={t.miniMap} className="sm:col-span-2">
          {pins.length === 0 ? (
            <EmptyState title={t.noCoordinates} description={t.mapBody} />
          ) : (
            <Suspense
              fallback={<div className="h-64 rounded-lg border border-border" />}
            >
              <TransportMap
                pins={pins}
                zones={[]}
                zoom={data.settings.mapZoom}
                className="h-64 w-full rounded-lg border border-border"
              />
            </Suspense>
          )}
        </Panel>
      </div>

      <Panel icon={FileWarning} title={t.expiring} description={t.expiringBody}>
        {alerts.length === 0 ? (
          <EmptyState title={t.none} description={t.expiringBody} />
        ) : (
          <ul className="divide-y divide-border">
            {alerts.slice(0, 25).map((a) => (
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
        <Panel
          icon={AlertTriangle}
          title={t.recentIncidents}
          actions={
            data.grants.includes("export") ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void exportCsv("incidents")}
              >
                {t.export}
              </Button>
            ) : null
          }
        >
          {incidents.length === 0 ? (
            <EmptyState title={t.none} />
          ) : (
            <ul className="divide-y divide-border">
              {incidents.slice(0, 8).map((i) => (
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

        <Panel
          icon={Inbox}
          title={t.openRequests}
          actions={
            data.grants.includes("export") ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void exportCsv("requests")}
              >
                {t.export}
              </Button>
            ) : null
          }
        >
          {data.openRequests.length === 0 ? (
            <EmptyState title={t.none} />
          ) : (
            <ul className="divide-y divide-border">
              {data.openRequests.slice(0, 8).map((r) => (
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
      </Panel>
    </div>
  );
}
