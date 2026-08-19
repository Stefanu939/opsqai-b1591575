import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Circle,
  Users,
  ShieldCheck,
  Wrench,
  Mail,
  MessageSquare,
  BookOpen,
  LineChart,
  Activity,
} from "lucide-react";
import { getManagementOverview } from "@/lib/dashboard.functions";
import { findIntegration } from "@/lib/integrations-catalog";
import {
  IntegrationConnectDialog,
  type IntegrationProviderKey,
} from "@/components/dashboard/integration-connect-dialog";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { Panel } from "@/components/ui/panel";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const DOCTOR_TONE: Record<string, "outline" | "secondary" | "destructive"> = {
  green: "outline",
  amber: "secondary",
  red: "destructive",
  "n/a": "outline",
};

const DOCTOR_LABEL: Record<string, string> = {
  green: "Healthy",
  amber: "Needs attention",
  red: "Action required",
  "n/a": "Unknown",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString();
}

/**
 * Phase 2 — management overview: seat capacity, get-started progress,
 * maintenance status, KPI/insight row and integration scaffolds. Extends
 * the existing dashboard read model (`getManagementOverview`) — no
 * client-side database access.
 */
export function ManagementOverview() {
  const fn = useServerFn(getManagementOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["dash", "management"],
    queryFn: () => fn({ data: {} }),
  });
  const [dialogProvider, setDialogProvider] = useState<IntegrationProviderKey | null>(null);

  if (isLoading || !data) {
    return (
      <BentoGrid>
        {Array.from({ length: 4 }).map((_, i) => (
          <BentoItem key={i} span={3} index={i}>
            <Skeleton className="h-[220px] w-full rounded-xl" />
          </BentoItem>
        ))}
      </BentoGrid>
    );
  }

  const seats = data.seats;
  const seatPct =
    seats.limit && seats.limit > 0 ? Math.min(100, Math.round((seats.used / seats.limit) * 100)) : 0;
  const doneCount = data.tips.filter((t) => t.done).length;
  const integrationProviders = ["outlook", "gmail", "teams"] as const;

  return (
    <BentoGrid>
      {/* User capacity */}
      <BentoItem span={4} index={0}>
        <Panel title="User capacity" icon={Users} className="h-full">
          <div className="flex flex-col items-center gap-3 py-2">
            {seats.limit ? (
              <>
                <ProgressRing
                  value={seatPct}
                  size={120}
                  thickness={10}
                  label={`${seats.used} / ${seats.limit}`}
                  sublabel="seats used"
                />
                <p className="text-center text-xs text-muted-foreground">
                  {Math.max(0, seats.limit - seats.used)} free seat
                  {seats.limit - seats.used === 1 ? "" : "s"}
                </p>
              </>
            ) : seats.unlimited ? (
              <>
                <ProgressRing value={100} size={120} thickness={10} label={seats.used} sublabel="active users" />
                <p className="text-center text-xs text-muted-foreground">Unlimited seats on this license.</p>
              </>
            ) : (
              <>
                <ProgressRing value={0} size={120} thickness={10} label={seats.used} sublabel="active users" />
                <p className="text-center text-xs text-muted-foreground">
                  No seat limit found on the active license.
                </p>
              </>
            )}
          </div>
        </Panel>
      </BentoItem>

      {/* Get started */}
      <BentoItem span={8} index={1}>
        <Panel
          title="Get started"
          icon={CheckCircle2}
          className="h-full"
          actions={<Badge variant="outline">{doneCount} / {data.tips.length} completed</Badge>}
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.tips.map((tip) => (
              <li
                key={tip.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  {tip.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={tip.done ? "text-muted-foreground line-through" : "truncate"}>
                    {tip.label}
                  </span>
                </span>
                {!tip.done && (
                  <Button asChild variant="ghost" size="sm" className="shrink-0">
                    <Link to={tip.to}>Go</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </BentoItem>

      {/* Maintenance status */}
      <BentoItem span={4} index={2}>
        <Panel title="Last maintenance" icon={Wrench} className="h-full">
          <p className="text-2xl font-semibold tabular-nums">{fmtDate(data.maintenance.lastMaintenanceAt)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Most recent backup / maintenance snapshot.</p>
        </Panel>
      </BentoItem>
      <BentoItem span={4} index={3}>
        <Panel title="Next scheduled maintenance" icon={Wrench} className="h-full">
          <p className="text-2xl font-semibold tabular-nums">
            {data.maintenance.nextMaintenanceAt ? fmtDate(data.maintenance.nextMaintenanceAt) : "Not scheduled"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">From the active maintenance contract, if any.</p>
        </Panel>
      </BentoItem>
      <BentoItem span={4} index={4}>
        <Panel
          title="System status"
          icon={ShieldCheck}
          className="h-full"
          actions={
            <Badge variant={DOCTOR_TONE[data.maintenance.overall] ?? "outline"}>
              {DOCTOR_LABEL[data.maintenance.overall] ?? "Unknown"}
            </Badge>
          }
        >
          <p className="text-sm text-muted-foreground">
            Rolled up from the platform's own health probes (storage, backups, license, disk).
          </p>
        </Panel>
      </BentoItem>

      {/* KPI + insight row */}
      <BentoItem span={3} index={5}>
        <Link to="/app/audit" className="oq-lift block h-full">
          <Panel title="AI Audit score" icon={LineChart} className="h-full">
            <p className="text-3xl font-semibold tabular-nums">{data.kpis.auditScore ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.kpis.auditCreatedAt ? `As of ${fmtDate(data.kpis.auditCreatedAt)}` : "No audit yet"}
            </p>
          </Panel>
        </Link>
      </BentoItem>
      <BentoItem span={3} index={6}>
        <Link to="/app/knowledge" className="oq-lift block h-full">
          <Panel title="Knowledge coverage" icon={BookOpen} className="h-full">
            <p className="text-3xl font-semibold tabular-nums">
              {data.kpis.knowledgeCoveragePct != null ? `${data.kpis.knowledgeCoveragePct}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Share of documents currently fresh.</p>
          </Panel>
        </Link>
      </BentoItem>
      <BentoItem span={3} index={7}>
        <Link to="/app/knowledge" className="oq-lift block h-full">
          <Panel title="Knowledge freshness" icon={Activity} className="h-full">
            <p className="text-3xl font-semibold tabular-nums">
              {data.kpis.freshness.outdated > 0
                ? `${data.kpis.freshness.outdated} outdated`
                : data.kpis.freshness.reviewSoon > 0
                  ? `${data.kpis.freshness.reviewSoon} due soon`
                  : "Up to date"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.kpis.freshness.total} document{data.kpis.freshness.total === 1 ? "" : "s"} tracked.
            </p>
          </Panel>
        </Link>
      </BentoItem>
      <BentoItem span={3} index={8}>
        <Link to="/app/faq" className="oq-lift block h-full">
          <Panel title="Compliance signal" icon={ShieldCheck} className="h-full">
            <p className="text-3xl font-semibold tabular-nums">
              {data.kpis.freshness.unreviewed > 0 ? `${data.kpis.freshness.unreviewed} unreviewed` : "Clear"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Documents never marked as reviewed.</p>
          </Panel>
        </Link>
      </BentoItem>

      {/* Integrations */}
      {integrationProviders.map((p, i) => {
        const def = findIntegration(p);
        const state = data.integrations[p];
        const connected = state?.status === "connected";
        return (
          <BentoItem key={p} span={4} index={9 + i}>
            <Panel
              title={def?.name ?? p}
              icon={p === "teams" ? MessageSquare : Mail}
              className="h-full"
              actions={<Badge variant={connected ? "outline" : "secondary"}>{connected ? "Connected" : "Not connected"}</Badge>}
            >
              {connected ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    {p === "teams"
                      ? "Recent Teams messages will appear here."
                      : p === "gmail"
                        ? "Recent emails will appear here."
                        : "Recent emails and upcoming meetings will appear here."}
                  </p>
                  <p className="text-xs">Connected {fmtDate(state?.connectedAt ?? null)}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    {def?.summary ?? "Connect to bring in recent activity."}
                  </p>
                  <Button variant="outline" size="sm" className="self-start" disabled>
                    Connect {def?.name ?? p}
                  </Button>
                </div>
              )}
            </Panel>
          </BentoItem>
        );
      })}
    </BentoGrid>
  );
}
