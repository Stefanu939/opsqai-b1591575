// OPSQAI HR — onboarding / offboarding: country flows with real dated tasks,
// running flows per employee, promotion / demotion / transfer with criteria.
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUpDown, ListChecks, LogOut, Play, UserPlus } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { recordHrPositionChange, startHrFlow } from "@/lib/hr-ws.functions";
import type { HrTask } from "@/lib/hr/types";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import type { HrUi } from "@/i18n/pages/hr";
import { useHrExtRefresh } from "./use-hr-ext";
import { useHrLang, useHrLifecycle } from "./use-hr-ws";
import { EmployeePicker, Field, fmtDate, ProgressBar, selectCls } from "./shared";
import { TasksSection } from "./tasks-section";

type Tab = "flows" | "running" | "changes";

export function LifecycleSection({ t, w, h }: { t: HrExtUi; w: HrWsUi; h: HrUi }) {
  const query = useHrLifecycle();
  const refresh = useHrExtRefresh();
  const language = useHrLang();
  const start = useServerFn(startHrFlow);
  const record = useServerFn(recordHrPositionChange);
  const [tab, setTab] = useState<Tab>("flows");
  const [search, setSearch] = useState("");
  const [flowKey, setFlowKey] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const [change, setChange] = useState<{
    kind: "promote" | "demote" | "transfer";
    toPositionId: string;
    toPosition: string;
    criteria: Array<{ label: string; met: boolean; note: string }>;
    reason: string;
    effectiveOn: string;
    generateLetter: boolean;
  }>({ kind: "promote", toPositionId: "", toPosition: "", criteria: [], reason: "", effectiveOn: "", generateLetter: true });
  const [openTasksFor, setOpenTasksFor] = useState<string | null>(null);

  const running = useMemo(() => {
    const rows = query.data?.tasks ?? [];
    const map = new Map<string, { employeeId: string; label: string; kind: string; tasks: HrTask[] }>();
    for (const task of rows) {
      if (!task.employee_id) continue;
      const key = `${task.employee_id}:${task.category}`;
      const entry = map.get(key) ?? {
        employeeId: task.employee_id,
        label: `${task.employee_no ?? ""} · ${task.employee_name ?? ""}`,
        kind: task.category,
        tasks: [],
      };
      entry.tasks.push(task);
      map.set(key, entry);
    }
    return [...map.values()]
      .map((r) => ({
        ...r,
        total: r.tasks.length,
        done: r.tasks.filter((x) => x.status === "done").length,
        overdue: r.tasks.filter((x) => (x.status === "pending" || x.status === "in_progress") && x.due_date && x.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10)).length,
        next: r.tasks.filter((x) => x.status === "pending" || x.status === "in_progress").sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0] ?? null,
      }))
      .filter((r) => !search.trim() || r.label.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => b.overdue - a.overdue || (a.done / a.total) - (b.done / b.total));
  }, [query.data, search]);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) return <EmptyState title={t.lifecycle} description={(query.error as Error).message} />;
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);
  const flow = data.flows.find((f) => f.key === flowKey) ?? null;
  const selectedEmployee = data.employees.find((e) => e.id === employeeId) ?? null;

  const openStart = (key: string) => {
    setFlowKey(key);
    setEmployeeId(null);
    setAnchor("");
  };
  const pickEmployee = (id: string | null) => {
    setEmployeeId(id);
    const e = data.employees.find((x) => x.id === id);
    if (e && flow) setAnchor(((flow.kind === "onboarding" ? e.start_date : e.end_date) ?? "").slice(0, 10));
  };
  const runStart = () => {
    if (!flow || !employeeId) return;
    void start({ data: { flowKey: flow.key, employeeId, anchorDate: anchor || null, language } })
      .then((r) => {
        toast.success(`${t.started} · ${r.created}`);
        setFlowKey(null);
        setTab("running");
        void refresh();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const openChange = (kind: "promote" | "demote" | "transfer") => {
    const criteria = (kind === "promote" ? data.promotionCriteria : kind === "demote" ? data.demotionCriteria : []).map((label) => ({ label, met: false, note: "" }));
    setChange({ kind, toPositionId: "", toPosition: "", criteria, reason: "", effectiveOn: new Date().toISOString().slice(0, 10), generateLetter: kind === "promote" });
    setChangeOpen(true);
  };
  const metCount = change.criteria.filter((c) => c.met).length;
  const criteriaWarn = change.kind !== "transfer" && change.criteria.length > 0 && metCount < Math.ceil(change.criteria.length / 2);
  const runChange = () => {
    if (!employeeId) return;
    const pos = data.positions.find((p) => p.id === change.toPositionId);
    void record({
      data: {
        employeeId,
        kind: change.kind,
        toPositionId: change.toPositionId || null,
        toPosition: pos?.name ?? change.toPosition.trim() ?? null,
        criteria: change.criteria.map((c) => ({ label: c.label, met: c.met, note: c.note || null })),
        reason: change.reason.trim() || null,
        effectiveOn: change.effectiveOn || null,
        generateLetter: change.generateLetter,
      },
    })
      .then(() => {
        toast.success(w.recorded);
        setChangeOpen(false);
        setTab("changes");
        void refresh();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  return (
    <div className="grid gap-4">
      <SegmentedTabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "flows", label: `${w.countryFlows} (${data.country.toUpperCase()})` },
          { value: "running", label: `${w.activeFlows} · ${running.length}` },
          { value: "changes", label: `${w.changesHistory} · ${data.changes.length}` },
        ]}
      />

      {tab === "flows" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.flows.map((f) => (
            <Panel
              key={f.key}
              icon={f.kind === "onboarding" ? UserPlus : LogOut}
              title={f.label}
              actions={
                can("create") ? (
                  <Button size="sm" onClick={() => openStart(f.key)}>
                    <Play className="mr-1.5 size-4" /> {w.startFlow}
                  </Button>
                ) : null
              }
            >
              <p className="mb-2 text-xs text-muted-foreground">
                {f.steps.length} {w.flowSteps}
              </p>
              <ol className="grid gap-1">
                {f.steps.map((s, i) => (
                  <li key={`${f.key}-${i}`} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1 text-sm">
                    <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate">{s.title}</span>
                    {s.documentKey ? <Badge variant="outline">doc</Badge> : null}
                    {s.priority === "high" ? <Badge variant="destructive">{w.high}</Badge> : null}
                    <span className="w-16 text-right text-xs text-muted-foreground">
                      {s.offsetDays >= 0 ? `+${s.offsetDays}` : s.offsetDays} d
                    </span>
                    <span className="w-20 truncate text-xs text-muted-foreground">{s.team ?? ""}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          ))}
        </div>
      ) : null}

      {tab === "running" ? (
        <Panel icon={ListChecks} title={w.activeFlows}>
          <Input className="mb-3 sm:w-80" placeholder={w.searchEmployee} value={search} onChange={(e) => setSearch(e.target.value)} />
          {running.length === 0 ? (
            <p className="text-sm text-muted-foreground">{w.noPipeline}</p>
          ) : (
            <ul className="grid gap-2">
              {running.map((r) => (
                <li key={`${r.employeeId}-${r.kind}`} className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={r.kind === "onboarding" ? "default" : "secondary"}>{r.kind === "onboarding" ? t.onboarding : t.offboarding}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{r.done}/{r.total}</span>
                    {r.overdue > 0 ? <Badge variant="destructive">{r.overdue} {w.overdue.toLowerCase()}</Badge> : null}
                    <Button size="sm" variant="outline" onClick={() => setOpenTasksFor(openTasksFor === r.employeeId ? null : r.employeeId)}>
                      {w.open}
                    </Button>
                  </div>
                  <ProgressBar value={r.done} max={r.total} className="mt-2" />
                  {r.next ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {w.nextStep}: {r.next.title} · {fmtDate(r.next.due_date)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}
      {tab === "running" && openTasksFor ? <TasksSection t={h} w={w} x={t} /> : null}

      {tab === "changes" ? (
        <Panel
          icon={ArrowUpDown}
          title={w.positionChange}
          actions={
            can("edit") ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => openChange("promote")}>{w.promote}</Button>
                <Button size="sm" variant="outline" onClick={() => openChange("demote")}>{w.demote}</Button>
                <Button size="sm" variant="outline" onClick={() => openChange("transfer")}>{w.transfer}</Button>
              </div>
            ) : null
          }
        >
          {data.changes.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.changes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <Badge variant={c.kind === "promote" ? "default" : c.kind === "demote" ? "destructive" : "secondary"}>
                    {c.kind === "promote" ? w.promote : c.kind === "demote" ? w.demote : w.transfer}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{c.employee_no} · {c.employee_name}</span>
                    <span className="text-muted-foreground"> · {c.from_position ?? "—"} → {c.to_position ?? "—"}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.criteria.filter((x) => x.met).length}/{c.criteria.length} {w.criteriaMet.toLowerCase()} · {fmtDate(c.effective_on)} · {c.decided_by ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {/* Start flow dialog */}
      <Dialog open={Boolean(flow)} onOpenChange={(o) => !o && setFlowKey(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{flow?.label} · {w.startFlow}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <EmployeePicker employees={data.employees} value={employeeId} onChange={pickEmployee} placeholder={w.searchEmployee} empty={w.noResults} />
            <Field label={w.anchorDate}>
              <Input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
            </Field>
            <p className="text-xs text-muted-foreground">{w.anchorHint}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFlowKey(null)}>{t.cancel}</Button>
            <Button disabled={!selectedEmployee} onClick={runStart}>
              <Play className="mr-1.5 size-4" /> {w.start}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position change dialog */}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{change.kind === "promote" ? w.promote : change.kind === "demote" ? w.demote : w.transfer}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <EmployeePicker employees={data.employees} value={employeeId} onChange={setEmployeeId} placeholder={w.searchEmployee} empty={w.noResults} limit={5} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={w.newPosition}>
                <select className={selectCls} value={change.toPositionId} onChange={(e) => setChange({ ...change, toPositionId: e.target.value })}>
                  <option value="">—</option>
                  {data.positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={w.effectiveOn}>
                <Input type="date" value={change.effectiveOn} onChange={(e) => setChange({ ...change, effectiveOn: e.target.value })} />
              </Field>
              {!change.toPositionId ? (
                <Field label={w.newPosition} className="sm:col-span-2">
                  <Input value={change.toPosition} onChange={(e) => setChange({ ...change, toPosition: e.target.value })} />
                </Field>
              ) : null}
            </div>
            {change.criteria.length > 0 ? (
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {w.criteriaMet} · {metCount}/{change.criteria.length}
                </span>
                {change.criteria.map((c, i) => (
                  <label key={c.label} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm">
                    <input type="checkbox" checked={c.met} onChange={(e) => setChange({ ...change, criteria: change.criteria.map((x, j) => (j === i ? { ...x, met: e.target.checked } : x)) })} />
                    <span className="flex-1">{c.label}</span>
                  </label>
                ))}
                {criteriaWarn ? <p className="text-xs text-amber-500">{w.criteriaWarning}</p> : null}
              </div>
            ) : null}
            <Field label={w.reason}>
              <Textarea rows={3} value={change.reason} onChange={(e) => setChange({ ...change, reason: e.target.value })} />
            </Field>
            {change.kind === "promote" ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={change.generateLetter} onChange={(e) => setChange({ ...change, generateLetter: e.target.checked })} />
                {w.generatePromotionLetter}
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChangeOpen(false)}>{t.cancel}</Button>
            <Button disabled={!employeeId || (!change.toPositionId && !change.toPosition.trim())} onClick={runChange}>{w.record}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
