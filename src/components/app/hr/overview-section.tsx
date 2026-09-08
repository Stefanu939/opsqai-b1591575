// OPSQAI HR — Overview: everything that needs action, lifecycle pipelines,
// signals from every HR workspace, alerts and recent activity. PDF export.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Download,
  LogOut,
  UserPlus,
  Users,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exportHrOverviewPdf } from "@/lib/hr.functions";
import type { HrOverview, HrPipelineRow } from "@/lib/hr/types";
import type { HrUi } from "@/i18n/pages/hr";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import { downloadBase64 } from "@/components/app/transport/download";
import { fmtDate, ProgressBar } from "./shared";
import { TasksSection } from "./tasks-section";

function Kpi({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: "critical" | "warn" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${tone === "critical" ? "text-destructive" : tone === "warn" ? "text-amber-500" : "text-foreground"}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function WsLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
      <Link to="/app/products/hr/$workspace" params={{ workspace: to }}>
        {children} <ArrowRight className="ml-1 size-3" />
      </Link>
    </Button>
  );
}

function Pipeline({ rows, title, icon: Icon, w, empty }: { rows: HrPipelineRow[]; title: string; icon: typeof Users; w: HrWsUi; empty: string }) {
  return (
    <Panel icon={Icon} title={`${title} · ${rows.length}`} actions={<WsLink to="lifecycle">{w.viewAll}</WsLink>}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {rows.slice(0, 8).map((p) => (
            <li key={`${p.employee_id}-${p.kind}`} className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <Link
                  to="/app/products/hr/$workspace"
                  params={{ workspace: "employees" }}
                  search={{ id: p.employee_id } as never}
                  className="truncate font-medium hover:underline"
                >
                  {p.employee_no} · {p.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {p.done}/{p.total}
                  {p.overdue > 0 ? <span className="ml-2 font-semibold text-destructive">{p.overdue} {w.overdue.toLowerCase()}</span> : null}
                </span>
              </div>
              <ProgressBar value={p.done} max={p.total} className="mt-1.5" />
              {p.next_task ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {w.nextStep}: {p.next_task} · {fmtDate(p.next_due)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function HrOverviewSection({ t, w, x, data }: { t: HrUi; w: HrWsUi; x: HrExtUi; data: HrOverview }) {
  const exportPdf = useServerFn(exportHrOverviewPdf);
  const [showTasks, setShowTasks] = useState(false);
  const a = data.actionRequired;
  const s = data.signals;
  const can = (g: string) => data.grants.includes(g as never);

  const lanes: Array<{ n: number; label: string; to: string; critical: boolean }> = [
    { n: a.overdueTasks, label: t.overdueTasks, to: "tasks", critical: true },
    { n: a.contractsExpiring, label: t.contractsExpiring, to: "analytics", critical: true },
    { n: s.complianceOverdue, label: w.complianceOverdue, to: "compliance", critical: true },
    { n: s.trainingsExpired, label: w.trainingsExpired, to: "training", critical: true },
    { n: s.documentsReview, label: w.documentsReview, to: "documents", critical: false },
    { n: s.openRequests, label: w.openRequests, to: "requests", critical: false },
    { n: a.openTasks, label: t.openTasks, to: "tasks", critical: false },
    { n: s.documentsExpiring, label: w.documentsExpiring, to: "documents", critical: false },
    { n: s.candidatesNew, label: w.candidatesNew, to: "screening", critical: false },
    { n: s.policiesPendingAck, label: w.policiesPendingAck, to: "policies", critical: false },
    { n: a.missingData, label: t.missingData, to: "employees", critical: false },
  ].filter((l) => l.n > 0);

  const signals: Array<{ n: number; label: string; to: string }> = [
    { n: s.documentsDraft, label: w.documentsDraft, to: "documents" },
    { n: s.candidatesShortlisted, label: w.candidatesShortlisted, to: "screening" },
    { n: s.trainingsPlanned, label: w.trainingsPlanned, to: "training" },
    { n: s.complianceOpen, label: w.complianceOpen, to: "compliance" },
    { n: s.positionChanges90d, label: w.positionChanges, to: "lifecycle" },
    { n: s.incidents30d, label: w.incidents30d, to: "incidents" },
  ];

  const onboarding = data.pipeline.filter((p) => p.kind === "onboarding");
  const offboarding = data.pipeline.filter((p) => p.kind === "offboarding");
  const levelLabel = (l: string) => (l === "critical" ? x.critical : l === "warning" ? x.warn : x.info);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild size="sm">
          <Link to="/app/products/hr/$workspace" params={{ workspace: "employees" }}>
            <UserPlus className="mr-1.5 size-4" /> {t.newEmployee}
          </Link>
        </Button>
        {can("export") ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void exportPdf()
                .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                .catch((e: Error) => toast.error(e.message))
            }
          >
            <Download className="mr-1.5 size-4" /> {w.exportPdf}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={t.employees} value={data.counts.total} hint={`${data.counts.active} · ${t.active}`} />
        <Kpi label={t.onboarding} value={data.counts.onboarding} hint={`${data.counts.newHires30d} · ${t.newHires}`} />
        <Kpi label={t.offboarding} value={data.counts.offboarding} hint={`${data.counts.leave} · ${t.onLeave}`} />
        <Kpi
          label={t.overdueTasks}
          value={a.overdueTasks}
          hint={`${a.openTasks} · ${t.openTasks}`}
          tone={a.overdueTasks > 0 ? "critical" : undefined}
        />
      </div>

      <Panel icon={AlertTriangle} title={w.todayQueue}>
        {lanes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noTasks}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {lanes.map((l) => (
              <li key={l.label}>
                <Link
                  to="/app/products/hr/$workspace"
                  params={{ workspace: l.to }}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2 hover:bg-muted/50"
                >
                  <span className="text-sm text-foreground">
                    <span className="font-semibold">{l.n}</span> {l.label}
                  </span>
                  <Badge variant={l.critical ? "destructive" : "secondary"}>{l.critical ? "!" : "•"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Pipeline rows={onboarding} title={w.pipelineOnboarding} icon={UserPlus} w={w} empty={w.noPipeline} />
        <Pipeline rows={offboarding} title={w.pipelineOffboarding} icon={LogOut} w={w} empty={w.noPipeline} />
      </div>

      <Panel icon={Users} title={w.workspaces}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((sg) => (
            <Link
              key={sg.label}
              to="/app/products/hr/$workspace"
              params={{ workspace: sg.to }}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-sm hover:bg-muted/50"
            >
              <span className="text-muted-foreground">{sg.label}</span>
              <span className="font-semibold">{sg.n}</span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel
        icon={Bell}
        title={`${t.tasks} · ${data.tasks.length}`}
        actions={
          <Button size="sm" variant="outline" onClick={() => setShowTasks((v) => !v)}>
            {showTasks ? w.close : w.open}
          </Button>
        }
      >
        {showTasks ? (
          <TasksSection t={t} w={w} x={x} />
        ) : data.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noTasks}</p>
        ) : (
          <ul className="grid gap-1.5">
            {data.tasks.slice(0, 8).map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-1.5 text-sm">
                <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => setShowTasks(true)}>
                  {task.employee_no ? <span className="text-muted-foreground">{task.employee_no} · </span> : null}
                  {task.title}
                </button>
                <Badge variant={task.priority === "high" ? "destructive" : "outline"}>{task.priority}</Badge>
                <span className="text-xs text-muted-foreground">{fmtDate(task.due_date)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={AlertTriangle} title={w.alerts} actions={<WsLink to="analytics">{w.viewAll}</WsLink>}>
          {data.alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{x.noAlerts}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.alerts.slice(0, 10).map((al) => (
                <li key={al.id} className="flex items-center gap-3 py-2">
                  <Badge variant={al.level === "critical" ? "destructive" : al.level === "warning" ? "default" : "outline"}>{levelLabel(al.level)}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm">{al.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{al.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel icon={Activity} title={w.recentActivity}>
          {data.recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noTimeline}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.recentEvents.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 py-2 text-sm">
                  <Badge variant="outline">{ev.kind}</Badge>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-muted-foreground">{ev.employee_no} · </span>
                    {ev.message}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtDate(ev.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
