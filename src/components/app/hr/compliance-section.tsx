// OPSQAI HR — Compliance: country library (DE/RO/generic), per-employee and company-wide items.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Plus, Sparkles, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteHrComplianceItem, saveHrComplianceItem, seedHrCompliance, setHrComplianceStatus } from "@/lib/hr-ws.functions";
import type { HrComplianceItem } from "@/lib/hr/types-ws";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import { useHrCompliance, useHrLang } from "./use-hr-ws";
import { useHrExtRefresh } from "./use-hr-ext";
import { EmployeePicker, Field, fmtDate, ProgressBar, selectCls, StatCell } from "./shared";

type Cat = "legal" | "safety" | "data_protection" | "payroll" | "medical";
type Draft = { id?: string; title: string; category: Cat; employee_id: string | null; due_date: string; notes: string };

export function ComplianceSection({ w }: { w: HrWsUi }) {
  const query = useHrCompliance();
  const language = useHrLang();
  const refresh = useHrExtRefresh();
  const seed = useServerFn(seedHrCompliance);
  const save = useServerFn(saveHrComplianceItem);
  const setStatus = useServerFn(setHrComplianceStatus);
  const remove = useServerFn(deleteHrComplianceItem);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [term, setTerm] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) return <EmptyState title={w.compliance} description={(query.error as Error).message} />;
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);
  const catLabel = (c: string) => ({ legal: w.legal, safety: w.safety, data_protection: w.dataProtection, payroll: w.payroll, medical: w.medical })[c] ?? c;
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (i: HrComplianceItem) => i.status === "open" && Boolean(i.due_date) && (i.due_date as string) < today;
  const open = data.items.filter((i) => i.status === "open");
  const overdue = data.items.filter(isOverdue);
  const relevant = data.items.filter((i) => i.status !== "not_applicable");
  const rate = relevant.length ? Math.round((relevant.filter((i) => i.status === "done").length / relevant.length) * 100) : 100;
  const rows = data.items
    .filter((i) => (!onlyOpen || i.status === "open") && (!onlyOverdue || isOverdue(i)))
    .filter((i) => `${i.title} ${i.employee_name ?? ""} ${i.employee_no ?? ""}`.toLowerCase().includes(term.toLowerCase()))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const byCat = (["legal", "safety", "data_protection", "payroll", "medical"] as Cat[]).map((c) => {
    const items = relevant.filter((i) => i.category === c);
    return { c, total: items.length, done: items.filter((i) => i.status === "done").length };
  }).filter((x) => x.total > 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCell label={w.complianceRate} value={`${rate}%`} tone={rate < 70 ? "critical" : rate < 90 ? "warn" : undefined} />
        <StatCell label={w.open} value={open.length} />
        <StatCell label={w.complianceOverdue} value={overdue.length} tone={overdue.length > 0 ? "critical" : undefined} />
        <StatCell label={w.country} value={data.country.toUpperCase()} />
      </div>

      <Panel
        icon={ShieldCheck}
        title={w.compliance}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-8 w-48" placeholder={w.search} value={term} onChange={(e) => setTerm(e.target.value)} />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> {w.onlyOpen}</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} /> {w.onlyOverdue}</label>
            {can("create") ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void seed({ data: { language } })
                      .then((r) => { toast.success(`${w.seeded} · ${r.created}`); void refresh(); })
                      .catch((e: Error) => toast.error(e.message))
                  }
                >
                  <Sparkles className="mr-1.5 size-4" /> {w.seedLibrary}
                </Button>
                <Button size="sm" onClick={() => setDraft({ title: "", category: "legal", employee_id: null, due_date: "", notes: "" })}>
                  <Plus className="mr-1.5 size-4" /> {w.newItem}
                </Button>
              </>
            ) : null}
          </div>
        }
      >
        {byCat.length > 0 ? (
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {byCat.map((x) => (
              <div key={x.c} className="grid gap-1 rounded-lg border border-border/60 p-2">
                <div className="flex justify-between text-xs"><span>{catLabel(x.c)}</span><span>{x.done}/{x.total}</span></div>
                <ProgressBar value={x.done} max={x.total} />
              </div>
            ))}
          </div>
        ) : null}
        {data.items.length === 0 ? (
          <EmptyState title={w.noCompliance} description={w.noComplianceBody} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{w.noData}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.slice(0, 300).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <Badge variant="outline">{catLabel(i.category)}</Badge>
                <Badge variant={isOverdue(i) ? "destructive" : i.status === "done" ? "default" : "secondary"}>
                  {isOverdue(i) ? w.overdue : i.status === "done" ? w.done : i.status === "not_applicable" ? w.notApplicable : w.open}
                </Badge>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{i.title}</span>
                  <span className="text-muted-foreground"> · {i.employee_name ? `${i.employee_no} ${i.employee_name}` : w.companyWide}</span>
                </span>
                <span className="text-xs text-muted-foreground">{i.due_date ? fmtDate(i.due_date) : "—"}</span>
                {can("edit") && i.status === "open" ? (
                  <>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => void setStatus({ data: { id: i.id, status: "done" } }).then(() => void refresh()).catch((e: Error) => toast.error(e.message))}>{w.markDone}</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => void setStatus({ data: { id: i.id, status: "not_applicable" } }).then(() => void refresh())}>{w.notApplicable}</Button>
                  </>
                ) : can("edit") ? (
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => void setStatus({ data: { id: i.id, status: "open" } }).then(() => void refresh())}>{w.reopen}</Button>
                ) : null}
                {can("delete") ? (
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => void remove({ data: { id: i.id } }).then(() => void refresh())}><Trash2 className="size-4" /></Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{w.newItem}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <Field label={w.taskTitle}>
                <Input value={draft.title} list="hr-comp-lib" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <datalist id="hr-comp-lib">{data.library.map((l) => <option key={l.key} value={l.title} />)}</datalist>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={w.category}>
                  <select className={selectCls} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Cat })}>
                    {(["legal", "safety", "data_protection", "payroll", "medical"] as Cat[]).map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
                </Field>
                <Field label={w.dueToday}>
                  <Input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
                </Field>
              </div>
              <Field label={`${w.perEmployee} / ${w.companyWide}`}>
                <EmployeePicker employees={data.employees} value={draft.employee_id} onChange={(id) => setDraft({ ...draft, employee_id: id })} placeholder={w.searchEmployee} empty={w.noResults} limit={5} />
              </Field>
              <Field label={w.details}>
                <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>{w.close}</Button>
            <Button
              disabled={!draft?.title.trim()}
              onClick={() =>
                draft &&
                void save({ data: { title: draft.title.trim(), category: draft.category, employee_id: draft.employee_id, due_date: draft.due_date || null, notes: draft.notes || null } })
                  .then(() => { toast.success(w.created); setDraft(null); void refresh(); })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {w.newItem}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
