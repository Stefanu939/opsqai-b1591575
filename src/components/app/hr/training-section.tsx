// OPSQAI HR — Training: catalogue, matrix (valid / planned / expired), records.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteHrTraining, deleteHrTrainingRecord, saveHrTraining, saveHrTrainingRecord } from "@/lib/hr-ws.functions";
import type { HrTraining } from "@/lib/hr/types-ws";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import { useHrTraining } from "./use-hr-ws";
import { useHrExtRefresh } from "./use-hr-ext";
import { Field, fmtDate, selectCls, StatCell } from "./shared";

type Cat = "safety" | "compliance" | "skills" | "onboarding" | "general";
type TDraft = { id?: string; title: string; category: Cat; mandatory: boolean; valid_months: string; description: string };
type RDraft = { training_id: string; employee_ids: Set<string>; status: "planned" | "completed"; date: string; score: string; notes: string };

export function TrainingSection({ w }: { w: HrWsUi }) {
  const query = useHrTraining();
  const refresh = useHrExtRefresh();
  const saveT = useServerFn(saveHrTraining);
  const delT = useServerFn(deleteHrTraining);
  const saveR = useServerFn(saveHrTrainingRecord);
  const delR = useServerFn(deleteHrTrainingRecord);
  const [tDraft, setTDraft] = useState<TDraft | null>(null);
  const [rDraft, setRDraft] = useState<RDraft | null>(null);
  const [term, setTerm] = useState("");
  const [focus, setFocus] = useState<string | null>(null);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) return <EmptyState title={w.training} description={(query.error as Error).message} />;
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);
  const catLabel = (c: string) => ({ safety: w.safety, compliance: w.compliance, skills: "Skills", onboarding: "Onboarding", general: w.general })[c] ?? c;
  const stLabel = (s: string) => ({ planned: w.planned, completed: w.completed, expired: w.expired })[s] ?? s;
  const existing = new Set(data.trainings.map((t) => t.title.toLowerCase()));
  const records = data.records.filter((r) => (!focus || r.training_id === focus) && `${r.employee_name ?? ""} ${r.employee_no ?? ""} ${r.training_title}`.toLowerCase().includes(term.toLowerCase()));
  const totals = data.trainings.reduce((s, t) => ({ valid: s.valid + t.valid_count, planned: s.planned + t.planned_count, expired: s.expired + t.expired_count }), { valid: 0, planned: 0, expired: 0 });

  const commitT = () => {
    if (!tDraft) return;
    void saveT({
      data: {
        id: tDraft.id,
        title: tDraft.title.trim(),
        category: tDraft.category,
        mandatory: tDraft.mandatory,
        valid_months: tDraft.valid_months ? Number(tDraft.valid_months) : null,
        description: tDraft.description || null,
      },
    })
      .then(() => { toast.success(w.created); setTDraft(null); void refresh(); })
      .catch((e: Error) => toast.error(e.message));
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCell label={w.valid} value={totals.valid} />
        <StatCell label={w.planned} value={totals.planned} />
        <StatCell label={w.expired} value={totals.expired} tone={totals.expired > 0 ? "critical" : undefined} />
      </div>

      <Panel
        icon={GraduationCap}
        title={w.matrix}
        actions={
          can("create") ? (
            <Button size="sm" onClick={() => setTDraft({ title: "", category: "safety", mandatory: true, valid_months: "12", description: "" })}>
              <Plus className="mr-1.5 size-4" /> {w.newTraining}
            </Button>
          ) : null
        }
      >
        {data.trainings.length === 0 ? (
          <EmptyState title={w.noTraining} description={w.noTrainingBody} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-3">{w.training}</th>
                  <th className="py-1.5 pr-3">{w.category}</th>
                  <th className="py-1.5 pr-3">{w.validMonths}</th>
                  <th className="py-1.5 pr-3 text-right">{w.valid}</th>
                  <th className="py-1.5 pr-3 text-right">{w.planned}</th>
                  <th className="py-1.5 pr-3 text-right">{w.expired}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.trainings.map((t) => (
                  <tr key={t.id} className={`border-t border-border/50 ${focus === t.id ? "bg-muted/40" : ""}`}>
                    <td className="py-2 pr-3">
                      <button type="button" className="text-left font-medium hover:underline" onClick={() => setFocus(focus === t.id ? null : t.id)}>{t.title}</button>
                      {t.mandatory ? <Badge variant="destructive" className="ml-2 text-[10px]">{w.mandatory}</Badge> : null}
                    </td>
                    <td className="py-2 pr-3">{catLabel(t.category)}</td>
                    <td className="py-2 pr-3">{t.valid_months ?? w.neverExpires}</td>
                    <td className="py-2 pr-3 text-right">{t.valid_count}</td>
                    <td className="py-2 pr-3 text-right">{t.planned_count}</td>
                    <td className={`py-2 pr-3 text-right ${t.expired_count > 0 ? "font-semibold text-destructive" : ""}`}>{t.expired_count}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {can("edit") ? (
                          <Button size="sm" variant="outline" onClick={() => setRDraft({ training_id: t.id, employee_ids: new Set(), status: "planned", date: new Date().toISOString().slice(0, 10), score: "", notes: "" })}>
                            {w.planFor}
                          </Button>
                        ) : null}
                        {can("edit") ? (
                          <Button size="sm" variant="ghost" onClick={() => setTDraft({ id: t.id, title: t.title, category: t.category as Cat, mandatory: t.mandatory, valid_months: t.valid_months ? String(t.valid_months) : "", description: t.description ?? "" })}>
                            {w.editDraft}
                          </Button>
                        ) : null}
                        {can("delete") ? (
                          <Button size="sm" variant="ghost" onClick={() => void delT({ data: { id: t.id } }).then(() => void refresh()).catch((e: Error) => toast.error(e.message))}>
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel
          icon={GraduationCap}
          title={w.records}
          actions={<Input className="h-8 w-52" placeholder={w.searchEmployee} value={term} onChange={(e) => setTerm(e.target.value)} />}
        >
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">{w.noData}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {records.slice(0, 200).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <Badge variant={r.status === "expired" ? "destructive" : r.status === "completed" ? "default" : "secondary"}>{stLabel(r.status)}</Badge>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{r.employee_no} · {r.employee_name}</span>
                    <span className="text-muted-foreground"> — {r.training_title}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.status === "planned" ? `${w.planned}: ${fmtDate(r.planned_on)}` : `${w.completedOn}: ${fmtDate(r.completed_on)}`}
                    {r.valid_until ? ` · ${w.valid} → ${fmtDate(r.valid_until)}` : ""}
                  </span>
                  {can("edit") && r.status === "planned" ? (
                    <Button size="sm" variant="outline" className="h-7" onClick={() => setRDraft({ training_id: r.training_id, employee_ids: new Set([r.employee_id]), status: "completed", date: new Date().toISOString().slice(0, 10), score: "", notes: "" })}>
                      {w.complete}
                    </Button>
                  ) : null}
                  {can("delete") ? (
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => void delR({ data: { id: r.id } }).then(() => void refresh())}>
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {can("create") ? (
          <Panel icon={GraduationCap} title={w.catalogue}>
            <ul className="grid gap-1.5">
              {data.catalogue.map((c) => {
                const done = existing.has(c.title.toLowerCase());
                return (
                  <li key={c.key} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    {c.mandatory ? <Badge variant="outline" className="text-[10px]">{w.mandatory}</Badge> : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      disabled={done}
                      onClick={() =>
                        void saveT({ data: { title: c.title, category: c.category as Cat, mandatory: c.mandatory, valid_months: c.validMonths ?? null } })
                          .then(() => void refresh())
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      {done ? "✓" : w.addFromCatalogue}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ) : null}
      </div>

      <Dialog open={Boolean(tDraft)} onOpenChange={(o) => !o && setTDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tDraft?.id ? w.editDraft : w.newTraining}</DialogTitle>
          </DialogHeader>
          {tDraft ? (
            <div className="grid gap-3">
              <Field label={w.taskTitle}>
                <Input value={tDraft.title} onChange={(e) => setTDraft({ ...tDraft, title: e.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={w.category}>
                  <select className={selectCls} value={tDraft.category} onChange={(e) => setTDraft({ ...tDraft, category: e.target.value as Cat })}>
                    {(["safety", "compliance", "skills", "onboarding", "general"] as Cat[]).map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
                </Field>
                <Field label={`${w.validMonths} (${w.neverExpires})`}>
                  <Input type="number" min={1} max={120} value={tDraft.valid_months} onChange={(e) => setTDraft({ ...tDraft, valid_months: e.target.value })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tDraft.mandatory} onChange={(e) => setTDraft({ ...tDraft, mandatory: e.target.checked })} /> {w.mandatory}
              </label>
              <Field label={w.description}>
                <Textarea value={tDraft.description} onChange={(e) => setTDraft({ ...tDraft, description: e.target.value })} />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTDraft(null)}>{w.close}</Button>
            <Button disabled={!tDraft?.title.trim()} onClick={commitT}>{w.saveDraft}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rDraft)} onOpenChange={(o) => !o && setRDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rDraft?.status === "completed" ? w.record : w.plan} · {data.trainings.find((t) => t.id === rDraft?.training_id)?.title}</DialogTitle>
          </DialogHeader>
          {rDraft ? (
            <RecordForm rDraft={rDraft} setRDraft={setRDraft} employees={data.employees} w={w} />
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRDraft(null)}>{w.close}</Button>
            <Button
              disabled={!rDraft || rDraft.employee_ids.size === 0}
              onClick={() =>
                rDraft &&
                void saveR({
                  data: {
                    training_id: rDraft.training_id,
                    employee_ids: [...rDraft.employee_ids],
                    status: rDraft.status,
                    planned_on: rDraft.status === "planned" ? rDraft.date || null : null,
                    completed_on: rDraft.status === "completed" ? rDraft.date || null : null,
                    score: rDraft.score || null,
                    notes: rDraft.notes || null,
                  },
                })
                  .then(() => { toast.success(w.recorded); setRDraft(null); void refresh(); })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {w.record} ({rDraft?.employee_ids.size ?? 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecordForm({ rDraft, setRDraft, employees, w }: { rDraft: RDraft; setRDraft: (d: RDraft) => void; employees: Array<{ id: string; label: string }>; w: HrWsUi }) {
  const [term, setTerm] = useState("");
  const list = employees.filter((e) => e.label.toLowerCase().includes(term.toLowerCase())).slice(0, 100);
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={w.status}>
          <select className={selectCls} value={rDraft.status} onChange={(e) => setRDraft({ ...rDraft, status: e.target.value as RDraft["status"] })}>
            <option value="planned">{w.planned}</option>
            <option value="completed">{w.completed}</option>
          </select>
        </Field>
        <Field label={rDraft.status === "planned" ? w.planned : w.completedOnDate}>
          <Input type="date" value={rDraft.date} onChange={(e) => setRDraft({ ...rDraft, date: e.target.value })} />
        </Field>
        <Field label={w.scoreResult}>
          <Input value={rDraft.score} onChange={(e) => setRDraft({ ...rDraft, score: e.target.value })} />
        </Field>
      </div>
      <Field label={w.selectEmployee}>
        <Input placeholder={w.searchEmployee} value={term} onChange={(e) => setTerm(e.target.value)} />
        <ul className="max-h-48 overflow-y-auto rounded-md border border-border/60">
          {list.map((e) => (
            <li key={e.id}>
              <label className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={rDraft.employee_ids.has(e.id)}
                  onChange={(ev) => {
                    const n = new Set(rDraft.employee_ids);
                    if (ev.target.checked) n.add(e.id); else n.delete(e.id);
                    setRDraft({ ...rDraft, employee_ids: n });
                  }}
                />
                {e.label}
              </label>
            </li>
          ))}
        </ul>
      </Field>
      <Field label={w.details}>
        <Textarea value={rDraft.notes} onChange={(e) => setRDraft({ ...rDraft, notes: e.target.value })} />
      </Field>
    </div>
  );
}

export type { HrTraining };
