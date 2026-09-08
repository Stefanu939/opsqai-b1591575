// OPSQAI HR — Policies & Procedures: versioned, country-aware starters, acknowledgements.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { acknowledgeHrPolicy, deleteHrPolicy, getHrPolicyAcks, saveHrPolicy } from "@/lib/hr-ws.functions";
import type { HrPolicy } from "@/lib/hr/types-ws";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import { useHrPolicies } from "./use-hr-ws";
import { useHrExtRefresh } from "./use-hr-ext";
import { Field, ProgressBar, selectCls, fmtDate, type EmployeeOption } from "./shared";

type Cat = HrPolicy["category"];
type Draft = { id?: string; title: string; category: Cat; body: string; requires_ack: boolean; effective_from: string; status: HrPolicy["status"]; bumpVersion: boolean };

export function PoliciesSection({ w }: { w: HrWsUi }) {
  const query = useHrPolicies();
  const refresh = useHrExtRefresh();
  const save = useServerFn(saveHrPolicy);
  const remove = useServerFn(deleteHrPolicy);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ackFor, setAckFor] = useState<HrPolicy | null>(null);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) return <EmptyState title={w.policies} description={(query.error as Error).message} />;
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);
  const catLabel = (c: string) => ({ policy: w.policy, procedure: w.procedure, safety: w.safety, code_of_conduct: w.codeOfConduct })[c] ?? c;
  const stLabel = (s: string) => ({ draft: w.draft, published: w.published, archived: w.archive })[s] ?? s;

  const commit = () => {
    if (!draft) return;
    void save({
      data: {
        id: draft.id,
        title: draft.title.trim(),
        category: draft.category,
        body: draft.body,
        status: draft.status,
        requires_ack: draft.requires_ack,
        effective_from: draft.effective_from || null,
        bumpVersion: draft.bumpVersion,
      },
    })
      .then(() => {
        toast.success(w.created);
        setDraft(null);
        void refresh();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  return (
    <div className="grid gap-6">
      <Panel
        icon={BookOpen}
        title={w.policies}
        actions={
          can("create") ? (
            <Button size="sm" onClick={() => setDraft({ title: "", category: "policy", body: "", requires_ack: true, effective_from: "", status: "draft", bumpVersion: false })}>
              <Plus className="mr-1.5 size-4" /> {w.newPolicy}
            </Button>
          ) : null
        }
      >
        {data.policies.length === 0 ? (
          <EmptyState title={w.noPolicies} description={w.noPoliciesBody} />
        ) : (
          <ul className="grid gap-2">
            {data.policies.map((p) => (
              <li key={p.id} className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{catLabel(p.category)}</Badge>
                  <Badge variant={p.status === "published" ? "default" : "secondary"}>{stLabel(p.status)}</Badge>
                  <span className="text-xs text-muted-foreground">{w.version} {p.version}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                  {p.effective_from ? <span className="text-xs text-muted-foreground">{w.effectiveFrom} {fmtDate(p.effective_from)}</span> : null}
                  {can("edit") ? (
                    <Button size="sm" variant="outline" onClick={() => setDraft({ id: p.id, title: p.title, category: p.category as Cat, body: p.body, requires_ack: p.requires_ack, effective_from: p.effective_from ?? "", status: p.status, bumpVersion: false })}>
                      {w.editDraft}
                    </Button>
                  ) : null}
                  {p.requires_ack && p.status === "published" && can("edit") ? (
                    <Button size="sm" variant="outline" onClick={() => setAckFor(p)}>
                      <CheckCircle2 className="mr-1.5 size-4" /> {w.recordAck}
                    </Button>
                  ) : null}
                  {can("delete") ? (
                    <Button size="sm" variant="ghost" onClick={() => void remove({ data: { id: p.id } }).then(() => void refresh()).catch((e: Error) => toast.error(e.message))}>
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                {p.requires_ack ? (
                  <div className="mt-2 grid gap-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{w.acknowledgements}</span>
                      <span>{p.ack_count} / {p.headcount}</span>
                    </div>
                    <ProgressBar value={p.ack_count} max={p.headcount} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {can("create") ? (
        <Panel icon={BookOpen} title={w.starters}>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {data.starters.map((s) => (
              <button
                key={s.key}
                type="button"
                className="rounded-lg border border-border/60 bg-card/50 p-3 text-left transition hover:border-primary/60"
                onClick={() => setDraft({ title: s.title, category: s.category as Cat, body: s.body, requires_ack: s.requiresAck, effective_from: "", status: "draft", bumpVersion: false })}
              >
                <Badge variant="outline">{catLabel(s.category)}</Badge>
                <p className="mt-1.5 text-sm font-medium">{s.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.body}</p>
                <p className="mt-2 text-xs text-primary">{w.useStarter}</p>
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? w.editDraft : w.newPolicy}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={w.taskTitle} className="sm:col-span-2">
                  <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </Field>
                <Field label={w.category}>
                  <select className={selectCls} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Cat })}>
                    {(["policy", "procedure", "safety", "code_of_conduct"] as Cat[]).map((c) => (
                      <option key={c} value={c}>{catLabel(c)}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Textarea className="min-h-72 font-mono text-xs" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={w.effectiveFrom}>
                  <Input type="date" value={draft.effective_from} onChange={(e) => setDraft({ ...draft, effective_from: e.target.value })} />
                </Field>
                <Field label={w.status}>
                  <select className={selectCls} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as HrPolicy["status"] })}>
                    <option value="draft">{w.draft}</option>
                    <option value="published">{w.publish}</option>
                    <option value="archived">{w.archive}</option>
                  </select>
                </Field>
                <div className="grid gap-2 pt-6 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={draft.requires_ack} onChange={(e) => setDraft({ ...draft, requires_ack: e.target.checked })} /> {w.requiresAck}
                  </label>
                  {draft.id ? (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={draft.bumpVersion} onChange={(e) => setDraft({ ...draft, bumpVersion: e.target.checked })} /> {w.newVersion}
                    </label>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>{w.close}</Button>
            <Button disabled={!draft?.title.trim()} onClick={commit}>{w.saveDraft}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ackFor ? <AckDialog policy={ackFor} employees={data.employees} w={w} onClose={() => { setAckFor(null); void refresh(); }} /> : null}
    </div>
  );
}

function AckDialog({ policy, employees, w, onClose }: { policy: HrPolicy; employees: EmployeeOption[]; w: HrWsUi; onClose: () => void }) {
  const acks = useServerFn(getHrPolicyAcks);
  const ack = useServerFn(acknowledgeHrPolicy);
  const [done, setDone] = useState<Set<string> | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [term, setTerm] = useState("");
  if (done === null) {
    void acks({ data: { policyId: policy.id } })
      .then((rows) => setDone(new Set((rows as Array<{ employee_id: string }>).map((r) => r.employee_id))))
      .catch(() => setDone(new Set()));
  }
  const list = employees.filter((e) => !done?.has(e.id) && e.label.toLowerCase().includes(term.toLowerCase()));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{w.recordAck} · {policy.title}</DialogTitle>
        </DialogHeader>
        <Input placeholder={w.searchEmployee} value={term} onChange={(e) => setTerm(e.target.value)} />
        <ul className="max-h-72 overflow-y-auto rounded-md border border-border/60">
          {list.slice(0, 200).map((e) => (
            <li key={e.id}>
              <label className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={picked.has(e.id)}
                  onChange={(ev) => {
                    const n = new Set(picked);
                    if (ev.target.checked) n.add(e.id); else n.delete(e.id);
                    setPicked(n);
                  }}
                />
                {e.label}
              </label>
            </li>
          ))}
          {list.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">{w.noResults}</li> : null}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{w.close}</Button>
          <Button
            disabled={picked.size === 0}
            onClick={() =>
              void ack({ data: { policyId: policy.id, employeeIds: [...picked] } })
                .then(() => { toast.success(w.recorded); onClose(); })
                .catch((e: Error) => toast.error(e.message))
            }
          >
            {w.recordAck} ({picked.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
