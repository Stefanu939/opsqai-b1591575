// Transport risk band — the first thing on the overview.
//
// Two lanes only, so nobody has to interpret numbers: "act now" (already
// expired / critical) and "plan this week" (manageable, still has time).
// Every line links to the register where the work is done.
import { Link } from "@tanstack/react-router";
import { AlertOctagon, CalendarClock, CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { transportUi } from "@/i18n/pages/transport";
import type { TransportOverview } from "@/lib/transport/types";

type Ui = ReturnType<typeof transportUi>;

interface RiskItem {
  key: string;
  label: string;
  count: number;
  to: string;
  hint?: string;
}

export function buildRiskLanes(t: Ui, data: TransportOverview) {
  const today = new Date().toISOString().slice(0, 10);
  const expired = data.alerts.filter((a) => a.level === "expired");
  const critical = data.alerts.filter((a) => a.level === "critical");
  const warning = data.alerts.filter((a) => a.level === "warning" || a.level === "watch");
  const criticalIncidents = data.recentIncidents.filter(
    (i) => i.severity === "critical" && i.status !== "closed" && i.status !== "cancelled",
  );
  const openIncidentsNoAction = data.recentIncidents.filter(
    (i) => !i.action_agreed && i.status !== "closed" && i.status !== "cancelled",
  );
  const overdueRequests = data.openRequests.filter((r) => r.due_on != null && r.due_on < today);
  const approvals = data.counts.pendingApprovals;
  const check = data.lastCheck;
  const auditOverdue = Boolean(
    check && check.status !== "completed" && check.due_on && check.due_on < today,
  );
  const auditMissing = !check;

  const now: RiskItem[] = [];
  const plan: RiskItem[] = [];

  const docs = "/app/products/transport/operations";
  if (expired.length)
    now.push({
      key: "expired",
      label: t.riskExpired,
      count: expired.length,
      to: docs,
      hint: expired
        .slice(0, 3)
        .map((a) => `${a.ownerLabel} · ${a.docLabel}`)
        .join(" · "),
    });
  if (criticalIncidents.length)
    now.push({
      key: "critical-incidents",
      label: t.riskCriticalIncidents,
      count: criticalIncidents.length,
      to: "/app/products/transport/incidents",
    });
  if (critical.length)
    now.push({
      key: "critical-docs",
      label: t.riskExpiring14,
      count: critical.length,
      to: docs,
      hint: critical
        .slice(0, 3)
        .map((a) => `${a.ownerLabel} · ${a.daysLeft}${t.daysShort}`)
        .join(" · "),
    });
  if (auditOverdue)
    now.push({
      key: "audit-overdue",
      label: t.riskAuditOverdue,
      count: 1,
      to: "/app/products/transport/procedures",
      hint: check?.due_on ?? undefined,
    });

  if (warning.length)
    plan.push({
      key: "warning-docs",
      label: t.riskExpiringSoon,
      count: warning.length,
      to: docs,
    });
  if (overdueRequests.length)
    plan.push({
      key: "overdue-requests",
      label: t.riskOverdueRequests,
      count: overdueRequests.length,
      to: "/app/products/transport/requests",
    });
  if (approvals)
    plan.push({
      key: "approvals",
      label: t.pendingApprovals,
      count: approvals,
      to: "/app/products/transport/requests",
    });
  if (openIncidentsNoAction.length)
    plan.push({
      key: "incidents-no-action",
      label: t.riskIncidentsNoAction,
      count: openIncidentsNoAction.length,
      to: "/app/products/transport/incidents",
    });
  if (auditMissing)
    plan.push({
      key: "audit-missing",
      label: t.riskAuditMissing,
      count: 1,
      to: "/app/products/transport/procedures",
    });

  return { now, plan };
}

function Lane({
  tone,
  title,
  description,
  items,
  emptyLabel,
}: {
  tone: "critical" | "plan";
  title: string;
  description: string;
  items: RiskItem[];
  emptyLabel: string;
}) {
  const Icon = tone === "critical" ? AlertOctagon : CalendarClock;
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <div
      className={
        tone === "critical"
          ? "rounded-xl border border-destructive/40 bg-destructive/5 p-4"
          : "rounded-xl border border-border bg-card p-4"
      }
    >
      <div className="flex items-center gap-2">
        <Icon
          className={tone === "critical" ? "size-4 text-destructive" : "size-4 text-amber-500"}
        />
        <p className="text-sm font-semibold">{title}</p>
        <Badge
          variant={tone === "critical" && total ? "destructive" : "outline"}
          className="ml-auto tabular-nums"
        >
          {total}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((i) => (
            <li key={i.key}>
              <Link
                to={i.to}
                className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{i.label}</span>
                  {i.hint ? (
                    <span className="block truncate text-xs text-muted-foreground">{i.hint}</span>
                  ) : null}
                </span>
                <span
                  className={
                    tone === "critical"
                      ? "text-lg font-semibold tabular-nums text-destructive"
                      : "text-lg font-semibold tabular-nums"
                  }
                >
                  {i.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RiskBand({ t, data }: { t: Ui; data: TransportOverview }) {
  const { now, plan } = buildRiskLanes(t, data);
  const clear = now.length === 0 && plan.length === 0;

  if (clear) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <ShieldAlert className="size-4 text-primary" />
        {t.riskAllClear}
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Lane
        tone="critical"
        title={t.riskNow}
        description={t.riskNowBody}
        items={now}
        emptyLabel={t.riskNoneNow}
      />
      <Lane
        tone="plan"
        title={t.riskPlan}
        description={t.riskPlanBody}
        items={plan}
        emptyLabel={t.riskNonePlan}
      />
    </div>
  );
}
