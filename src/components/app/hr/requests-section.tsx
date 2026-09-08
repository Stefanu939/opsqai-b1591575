// OPSQAI HR — Employee requests: intake, review, decision, optional follow-up task.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Inbox, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { decideHrRequest, deleteHrRequest, saveHrRequest } from "@/lib/hr-ws.functions";
import type { HrRequest } from "@/lib/hr/types-ws";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import { useHrRequests } from "./use-hr-ws";
import { useHrExtRefresh } from "./use-hr-ext";
import { EmployeePicker, Field, fmtDate, selectCls } from "./shared";

type Kind = "leave" | "certificate" | "equipment" | "data_change" | "training" | "other";
const KINDS: Kind[] = ["leave", "certificate", "equipment", "data_change", "training", "other"];
const COLUMNS: Array<HrRequest["status"]> = ["open", "in_review", "approved", "rejected", "done"];

export function RequestsSection({ w }: { w: HrWsUi }) {
  const query = useHrRequests();
  const refresh = useHrExtRefresh();
  const save = useServerFn(saveHrRequest);
  const decide = useServerFn(decideHrRequest);
  const remove = useServerFn(deleteHrRequest);
  const [draft, setDraft] = useState<{ employee_id: string | null; kind: Kind; title: string; details: string; from_date: string; to_date: string } | null>(null);
  const [decision, setDecision] = useState<{ req: HrRequest; status: HrRequest["status"]; note: string; createTask: boolean } | null>(null);
  const [term, setTerm] = useState("");
  const [drag, setDrag] = useState<string | null>(null);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) return <EmptyState title={w.requests} description={(query.error as Error).message} />;
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);
  const kindLabel = (k: string) => ({ leave: w.leave, certificate: w.certificate, equipment: w.equipmentReq, data_change: w.dataChange, training: w.trainingReq, other: w.other })[k] ?? k;
  const stLabel = (s: string) => ({ open: w.open, in_review: w.inReview, approved: w.approved, rejected: w.rejected, done: w.done })[s] ?? s;
  const rows = data.requests.filter((r) => `${r.title} ${r.employee_name ?? ""} ${r.employee_no ?? ""}`.toLowerCase().includes(term.toLowerCase()));

  const moveTo = (req: HrRequest, status: HrRequest["status"]) => {
    if (req.status === status) return;
    if (!can("approve")) return;
    setDecision({ req, status, note: "", createTask: status === "approved" });
  };

  return (
    <div className="grid gap-6">
      <Panel
        icon={Inbox}
        title={w.requests}
        actions={
          <div className="flex items-center gap-2">
            <Input className="h-8 w-52" placeholder={w.search} value={term} onChange={(e) => setTerm(e.target.value)} />
            {can("create") ? (
              <Button size="sm" onClick={() => setDraft({ employee_id: null, kind: "leave", title: "", details: "", from_date: "", to_date: "" })}>
                <Plus className="mr-1.5 size-4" /> {w.newRequest}
              </Button>
            ) : null}
          </div>
        }
      >
        {data.requests.length === 0 ? (
          <EmptyState title={w.noRequests} description={w.noRequestsBody} />
        ) : (
          <div className="grid gap-3 md:grid-cols-5">
            {COLUMNS.map((col) => {
              const items = rows.filter((r) => r.status === col);
              return (
                <div
                  key={col}
                  className="min-h-40 rounded-lg border border-dashed border-border/60 bg-card/30 p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const req = data.requests.find((r) => r.id === drag);
                    if (req) moveTo(req, col);
                    setDrag(null);
                  }}
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stLabel(col)}</span>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  <ul className="grid gap-2">
                    {items.map((r) => (
                      <li
                        key={r.id}
                        draggable={can("approve")}
                        onDragStart={() => setDrag(r.id)}
                        className="cursor-grab rounded-md border border-border/60 bg-card p-2 text-sm shadow-sm active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{kindLabel(r.kind)}</Badge>
                          {can("delete") ? (
                            <button type="button" className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => void remove({ data: { id: r.id } }).then(() => void refresh())}>
                              <Trash2 className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-1 font-medium leading-tight">{r.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.employee_no ? `${r.employee_no} · ` : ""}{r.employee_name ?? "—"}</p>
                        {r.from_date ? <p className="text-xs text-muted-foreground">{fmtDate(r.from_date)}{r.to_date ? ` → ${fmtDate(r.to_date)}` : ""}</p> : null}
                        {r.decision_note ? <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">{r.decision_note}</p> : null}
                        {can("approve") && (col === "open" || col === "in_review") ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {col === "open" ? <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => moveTo(r, "in_review")}>{w.review}</Button> : null}
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => moveTo(r, "approved")}>{w.approve}</Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => moveTo(r, "rejected")}>{w.rejectReq}</Button>
                          </div>
                        ) : null}
                        {can("approve") && col === "approved" ? (
                          <Button size="sm" variant="ghost" className="mt-2 h-6 px-2 text-xs" onClick={() => moveTo(r, "done")}>{w.markDone}</Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{w.newRequest}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <Field label={w.selectEmployee}>
                <EmployeePicker employees={data.employees} value={draft.employee_id} onChange={(id) => setDraft({ ...draft, employee_id: id })} placeholder={w.searchEmployee} empty={w.noResults} limit={5} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={w.category}>
                  <select className={selectCls} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}>
                    {KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
                  </select>
                </Field>
                <Field label={w.taskTitle}>
                  <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </Field>
                <Field label={w.fromDate}>
                  <Input type="date" value={draft.from_date} onChange={(e) => setDraft({ ...draft, from_date: e.target.value })} />
                </Field>
                <Field label={w.toDate}>
                  <Input type="date" value={draft.to_date} onChange={(e) => setDraft({ ...draft, to_date: e.target.value })} />
                </Field>
              </div>
              <Field label={w.details}>
                <Textarea value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>{w.close}</Button>
            <Button
              disabled={!draft?.title.trim()}
              onClick={() =>
                draft &&
                void save({
                  data: {
                    employee_id: draft.employee_id,
                    kind: draft.kind,
                    title: draft.title.trim(),
                    details: draft.details || null,
                    from_date: draft.from_date || null,
                    to_date: draft.to_date || null,
                  },
                })
                  .then(() => { toast.success(w.created); setDraft(null); void refresh(); })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {w.newRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(decision)} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{w.decision} · {decision ? stLabel(decision.status) : ""}</DialogTitle>
          </DialogHeader>
          {decision ? (
            <div className="grid gap-3">
              <p className="text-sm"><span className="font-medium">{decision.req.title}</span> · {decision.req.employee_name ?? "—"}</p>
              <Field label={w.decisionNote}>
                <Textarea value={decision.note} onChange={(e) => setDecision({ ...decision, note: e.target.value })} />
              </Field>
              {decision.status === "approved" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={decision.createTask} onChange={(e) => setDecision({ ...decision, createTask: e.target.checked })} /> {w.createTaskOnApprove}
                </label>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecision(null)}>{w.close}</Button>
            <Button
              onClick={() =>
                decision &&
                void decide({ data: { id: decision.req.id, status: decision.status, note: decision.note || null, createTask: decision.createTask } })
                  .then(() => { toast.success(w.recorded); setDecision(null); void refresh(); })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {w.decision}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
