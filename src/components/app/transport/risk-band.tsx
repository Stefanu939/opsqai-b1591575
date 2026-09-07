// Transport risk band — the first thing on the overview.
//
// Two lanes only, so nobody has to interpret numbers: "act now" (already
// expired / critical) and "plan this week" (manageable, still has time).
// Every line links to the register where the work is done, and every line can
// carry a responsible person plus a due date, with a history of assignments.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertOctagon,
  CalendarClock,
  Check,
  CheckCircle2,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { transportUi } from "@/i18n/pages/transport";
import type { RiskAction, TransportOverview } from "@/lib/transport/types";
import { useRiskActionMutations } from "./use-transport";

type Ui = ReturnType<typeof transportUi>;

export interface RiskItem {
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
  t,
  tone,
  title,
  description,
  items,
  emptyLabel,
  actions,
  canAssign,
  onAssign,
  onDone,
}: {
  t: Ui;
  tone: "critical" | "plan";
  title: string;
  description: string;
  items: RiskItem[];
  emptyLabel: string;
  actions: RiskAction[];
  canAssign: boolean;
  onAssign: (item: RiskItem, action: RiskAction | null) => void;
  onDone: (action: RiskAction) => void;
}) {
  const Icon = tone === "critical" ? AlertOctagon : CalendarClock;
  const total = items.reduce((s, i) => s + i.count, 0);
  const today = new Date().toISOString().slice(0, 10);
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
          {items.map((i) => {
            const action = actions.find((a) => a.risk_key === i.key && a.status === "open") ?? null;
            const late = Boolean(action?.due_on && action.due_on < today);
            return (
              <li key={i.key} className="rounded-lg px-2 py-1.5 hover:bg-muted/60">
                <div className="flex items-start justify-between gap-3">
                  <Link to={i.to} className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{i.label}</span>
                    {i.hint ? (
                      <span className="block truncate text-xs text-muted-foreground">{i.hint}</span>
                    ) : null}
                  </Link>
                  <span
                    className={
                      tone === "critical"
                        ? "text-lg font-semibold tabular-nums text-destructive"
                        : "text-lg font-semibold tabular-nums"
                    }
                  >
                    {i.count}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <UserRound className="size-3" />
                    {action?.owner_name || t.noOwner}
                  </span>
                  {action?.due_on ? (
                    <Badge variant={late ? "destructive" : "outline"} className="text-[11px]">
                      {t.riskDue}: {action.due_on}
                    </Badge>
                  ) : null}
                  {canAssign ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => onAssign(i, action)}
                      >
                        {action ? t.edit : t.assign}
                      </Button>
                      {action ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => onDone(action)}
                        >
                          <Check className="mr-1 size-3" />
                          {t.markDone}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function RiskBand({ t, data }: { t: Ui; data: TransportOverview }) {
  const { now, plan } = buildRiskLanes(t, data);
  const { assign, markDone } = useRiskActionMutations();
  const canAssign = data.grants.includes("edit");
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{ item: RiskItem; action: RiskAction | null } | null>(null);
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");

  const startAssign = (item: RiskItem, action: RiskAction | null) => {
    setTarget({ item, action });
    setOwner(action?.owner_name ?? "");
    setDue(action?.due_on ?? "");
    setNote(action?.note ?? "");
    setOpen(true);
  };

  const submit = () => {
    if (!target) return;
    void assign
      .mutateAsync({
        id: target.action?.id ?? null,
        riskKey: target.item.key,
        subject: target.item.label,
        ownerName: owner.trim() || null,
        dueOn: due || null,
        note: note.trim() || null,
      })
      .then(() => setOpen(false));
  };

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
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        <Lane
          t={t}
          tone="critical"
          title={t.riskNow}
          description={t.riskNowBody}
          items={now}
          emptyLabel={t.riskNoneNow}
          actions={data.riskActions}
          canAssign={canAssign}
          onAssign={startAssign}
          onDone={(a) => void markDone.mutateAsync(a.id)}
        />
        <Lane
          t={t}
          tone="plan"
          title={t.riskPlan}
          description={t.riskPlanBody}
          items={plan}
          emptyLabel={t.riskNonePlan}
          actions={data.riskActions}
          canAssign={canAssign}
          onAssign={startAssign}
          onDone={(a) => void markDone.mutateAsync(a.id)}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.assignRisk}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">{target?.item.label}</p>
            <div>
              <Label className="text-xs">{t.ownerName}</Label>
              <Input className="mt-1" value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t.riskDue}</Label>
              <Input
                className="mt-1"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">{t.notes}</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={submit} disabled={assign.isPending}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
