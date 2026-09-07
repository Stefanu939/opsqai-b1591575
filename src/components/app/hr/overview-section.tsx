// OPSQAI HR — Overview: headcount, lifecycle and what needs action today.
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, ListChecks, UserPlus, Users } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HrOverview } from "@/lib/hr/types";
import type { HrUi } from "@/i18n/pages/hr";

function Kpi({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function HrOverviewSection({ t, data }: { t: HrUi; data: HrOverview }) {
  const a = data.actionRequired;
  const lanes = [
    { n: a.contractsExpiring, label: t.contractsExpiring, critical: true },
    { n: a.overdueTasks, label: t.overdueTasks, critical: true },
    { n: a.openTasks, label: t.openTasks, critical: false },
    { n: a.missingData, label: t.missingData, critical: false },
  ].filter((l) => l.n > 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={t.employees} value={data.counts.total} />
        <Kpi label={t.active} value={data.counts.active} />
        <Kpi label={t.onboarding} value={data.counts.onboarding} hint={`${data.counts.newHires30d} · ${t.newHires}`} />
        <Kpi label={t.offboarding} value={data.counts.offboarding} hint={`${data.counts.leave} · ${t.onLeave}`} />
      </div>

      <Panel icon={AlertTriangle} title={t.actionRequired}>
        {lanes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noTasks}</p>
        ) : (
          <ul className="grid gap-2">
            {lanes.map((l) => (
              <li
                key={l.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2"
              >
                <span className="text-sm text-foreground">
                  <span className="font-semibold">{l.n}</span> {l.label}
                </span>
                <Badge variant={l.critical ? "destructive" : "secondary"}>
                  {l.critical ? "!" : "•"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Users} title={t.employeeList}>
          <p className="text-sm text-muted-foreground">{t.noneBody}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/app/products/hr/employees">
                <UserPlus className="mr-1.5 size-4" />
                {t.newEmployee}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/products/hr/employees">
                {t.employeeList}
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        </Panel>

        <Panel icon={ListChecks} title={t.tasks}>
          {data.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noTasks}</p>
          ) : (
            <ul className="grid gap-2">
              {data.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{task.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {task.due_date ? task.due_date.slice(0, 10) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <Link to="/app/products/hr/tasks">{t.tasks}</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
