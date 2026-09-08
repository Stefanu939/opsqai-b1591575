// OPSQAI HR — workable task queue: open a task, follow its steps, generate the
// linked document, write the resolution, mark it done, export the queue as PDF.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Download, FileText, ListChecks, Plus, RotateCcw, Trash2, Wand2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteHrTask, exportHrTasksPdf, saveHrTask } from "@/lib/hr.functions";
import { generateHrDocument } from "@/lib/hr-ext.functions";
import type { HrTask, HrTaskStep } from "@/lib/hr/types";
import { downloadBase64 } from "@/components/app/transport/download";
import type { HrUi } from "@/i18n/pages/hr";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import { useHrRefresh, useHrTasks } from "./use-hr";
import { useHrDocuments } from "./use-hr-ext";
import { DocumentDialog } from "./documents-section";
import { EmployeePicker, Field, fmtDate, ProgressBar, selectCls } from "./shared";

type Filter = "open" | "overdue" | "all";

export function TasksSection({ t, w, x, initialTaskId }: { t: HrUi; w: HrWsUi; x: HrExtUi; initialTaskId?: string | null }) {
  const query = useHrTasks(false);
  const refresh = useHrRefresh();
  const remove = useServerFn(deleteHrTask);
  const exportPdf = useServerFn(exportHrTasksPdf);
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialTaskId ?? null);
  const [creating, setCreating] = useState(false);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) return <EmptyState title={t.tasks} description={(query.error as Error).message} />;
  const grants = query.data!.grants;
  const can = (g: string) => grants.includes(g as never);
  const today = new Date().toISOString().slice(0, 10);
  const isOpen = (task: HrTask) => task.status === "pending" || task.status === "in_progress";
  const isOverdue = (task: HrTask) => isOpen(task) && Boolean(task.due_date) && task.due_date!.slice(0, 10) < today;
  const q = search.trim().toLowerCase();
  const tasks = query.data!.tasks.filter(
    (task) =>
      (filter === "all" || (filter === "open" ? isOpen(task) : isOverdue(task))) &&
      (!q || `${task.title} ${task.employee_no ?? ""} ${task.employee_name ?? ""} ${task.team ?? ""}`.toLowerCase().includes(q)),
  );
  const open = query.data!.tasks.filter(isOpen).length;
  const overdue = query.data!.tasks.filter(isOverdue).length;
  const current = openId ? query.data!.tasks.find((task) => task.id === openId) ?? null : null;

  const prioVariant = (p: string) => (p === "high" ? "destructive" : p === "low" ? "outline" : "secondary");
  const statusLabel = (s: HrTask["status"]) =>
    s === "done" ? w.done : s === "in_progress" ? w.inProgress : s === "cancelled" ? w.cancelled : w.pending;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <p className="text-xs text-muted-foreground">{w.open}</p>
          <p className="mt-1 text-2xl font-semibold">{open}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <p className="text-xs text-muted-foreground">{w.overdue}</p>
          <p className={`mt-1 text-2xl font-semibold ${overdue > 0 ? "text-destructive" : ""}`}>{overdue}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <p className="text-xs text-muted-foreground">{w.done}</p>
          <p className="mt-1 text-2xl font-semibold">{query.data!.tasks.filter((task) => task.status === "done").length}</p>
        </div>
      </div>

      <Panel
        icon={ListChecks}
        title={w.taskQueue}
        actions={
          <div className="flex flex-wrap gap-2">
            {can("export") ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void exportPdf({ data: { openOnly: filter !== "all" } })
                    .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                    .catch((e: Error) => toast.error(e.message))
                }
              >
                <Download className="mr-1.5 size-4" /> {w.exportPdf}
              </Button>
            ) : null}
            {can("create") ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="mr-1.5 size-4" /> {w.newTask}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SegmentedTabs<Filter>
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: w.onlyOpen },
              { value: "overdue", label: w.onlyOverdue },
              { value: "all", label: t.all },
            ]}
          />
          <Input className="sm:w-72" placeholder={w.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noTasks}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {tasks.map((task) => {
              const done = task.steps.filter((s) => s.done).length;
              return (
                <li key={task.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Badge variant={prioVariant(task.priority)}>{task.priority === "high" ? w.high : task.priority === "low" ? w.low : w.normal}</Badge>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(task.id)}>
                    <span className={`block truncate text-sm font-medium hover:underline ${task.status === "done" ? "line-through opacity-60" : ""}`}>
                      {task.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {task.employee_no ? `${task.employee_no} · ${task.employee_name} · ` : ""}
                      {task.category}
                      {task.team ? ` · ${task.team}` : ""}
                      {task.document_title ? ` · ${task.document_title}` : ""}
                    </span>
                  </button>
                  {task.steps.length > 0 ? (
                    <span className="w-28">
                      <ProgressBar value={done} max={task.steps.length} />
                    </span>
                  ) : null}
                  <span className={`text-xs ${isOverdue(task) ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                    {fmtDate(task.due_date)}
                  </span>
                  <Badge variant={task.status === "done" ? "default" : "outline"}>{statusLabel(task.status)}</Badge>
                  {can("delete") ? (
                    <Button size="sm" variant="ghost" onClick={() => void remove({ data: { id: task.id } }).then(() => void refresh()).catch((e: Error) => toast.error(e.message))}>
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {current ? <TaskDialog task={current} onClose={() => setOpenId(null)} t={t} w={w} x={x} can={can} /> : null}
      {creating ? <TaskDialog task={null} onClose={() => setCreating(false)} t={t} w={w} x={x} can={can} /> : null}
    </div>
  );
}

function TaskDialog({
  task,
  onClose,
  t,
  w,
  x,
  can,
}: {
  task: HrTask | null;
  onClose: () => void;
  t: HrUi;
  w: HrWsUi;
  x: HrExtUi;
  can: (g: string) => boolean;
}) {
  const save = useServerFn(saveHrTask);
  const generate = useServerFn(generateHrDocument);
  const refresh = useHrRefresh();
  const employees = useHrDocuments();
  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    team: task?.team ?? "",
    assigned_to: task?.assigned_to ?? "",
    due_date: task?.due_date?.slice(0, 10) ?? "",
    priority: task?.priority ?? "normal",
    steps: (task?.steps ?? []) as HrTaskStep[],
    resolution: task?.resolution ?? "",
    employee_id: task?.employee_id ?? null,
    status: task?.status ?? "pending",
  });
  const [newStep, setNewStep] = useState("");
  const [docOpen, setDocOpen] = useState<string | null>(null);
  const locked = task?.status === "done" || task?.status === "cancelled";

  const persist = (patch?: Partial<typeof form>) => {
    const f = { ...form, ...patch };
    if (!f.title.trim()) {
      toast.error(w.taskTitle);
      return Promise.resolve();
    }
    return save({
      data: {
        id: task?.id,
        employee_id: f.employee_id,
        title: f.title.trim(),
        description: f.description.trim() || null,
        category: task?.category ?? "general",
        team: f.team.trim() || null,
        assigned_to: f.assigned_to.trim() || null,
        due_date: f.due_date || null,
        priority: f.priority as "low" | "normal" | "high",
        steps: f.steps,
        document_id: task?.document_id ?? null,
        document_key: task?.document_key ?? null,
        resolution: f.resolution.trim() || null,
        status: f.status as HrTask["status"],
      },
    })
      .then(() => {
        toast.success(t.saved);
        void refresh();
        if (!task || patch?.status) onClose();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const generateDoc = () => {
    if (!task?.employee_id || !task.document_key) return;
    void generate({ data: { employeeId: task.employee_id, documentKey: task.document_key, taskId: task.id } })
      .then((r) => {
        toast.success(w.generated);
        void refresh();
        setDocOpen(r.id);
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const stepsDone = form.steps.filter((s) => s.done).length;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {task ? (
              <>
                <Badge variant="outline">{task.category}</Badge>
                <span>{task.title}</span>
              </>
            ) : (
              w.newTask
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {!task ? (
            <Field label={t.employees}>
              <EmployeePicker
                employees={employees.data?.employees ?? []}
                value={form.employee_id}
                onChange={(id) => setForm({ ...form, employee_id: id })}
                placeholder={w.searchEmployee}
                empty={w.noResults}
                limit={5}
              />
            </Field>
          ) : task.employee_no ? (
            <p className="text-sm text-muted-foreground">
              {t.employees}: <span className="font-medium text-foreground">{task.employee_no} · {task.employee_name}</span>
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={w.taskTitle} className="sm:col-span-2">
              <Input value={form.title} disabled={locked} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label={t.team}>
              <Input value={form.team} disabled={locked} onChange={(e) => setForm({ ...form, team: e.target.value })} />
            </Field>
            <Field label={t.assignedTo}>
              <Input value={form.assigned_to} disabled={locked} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
            </Field>
            <Field label={t.dueDate}>
              <Input type="date" value={form.due_date} disabled={locked} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
            <Field label={w.priority}>
              <select className={selectCls} value={form.priority} disabled={locked} onChange={(e) => setForm({ ...form, priority: e.target.value as HrTask["priority"] })}>
                <option value="low">{w.low}</option>
                <option value="normal">{w.normal}</option>
                <option value="high">{w.high}</option>
              </select>
            </Field>
          </div>
          <Field label={w.description}>
            <Textarea rows={3} value={form.description} disabled={locked} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {w.steps} · {stepsDone}/{form.steps.length}
              </span>
              {form.steps.length > 0 ? <span className="w-32"><ProgressBar value={stepsDone} max={form.steps.length} /></span> : null}
            </div>
            <ul className="grid gap-1">
              {form.steps.map((s, i) => (
                <li key={`${s.title}-${i}`} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={s.done}
                    disabled={locked}
                    onChange={(e) => setForm({ ...form, steps: form.steps.map((st, j) => (j === i ? { ...st, done: e.target.checked } : st)) })}
                  />
                  <span className={`flex-1 ${s.done ? "line-through opacity-60" : ""}`}>{s.title}</span>
                  {!locked ? (
                    <button type="button" className="text-xs text-muted-foreground" onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}>
                      ×
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            {!locked ? (
              <div className="flex gap-2">
                <Input value={newStep} placeholder={w.addStep} onChange={(e) => setNewStep(e.target.value)} />
                <Button
                  variant="outline"
                  disabled={!newStep.trim()}
                  onClick={() => { setForm({ ...form, steps: [...form.steps, { title: newStep.trim(), done: false }] }); setNewStep(""); }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>

          {task?.document_key || task?.document_id ? (
            <div className="rounded-lg border border-border/60 bg-card/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">{w.linkedDocument}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {task.document_id ? (
                  <>
                    <Badge variant="outline">{task.document_status ?? "—"}</Badge>
                    <span className="text-sm">{task.document_title}</span>
                    <Button size="sm" variant="outline" onClick={() => setDocOpen(task.document_id)}>
                      <FileText className="mr-1.5 size-4" /> {w.openDocument}
                    </Button>
                  </>
                ) : task.employee_id && can("create") ? (
                  <Button size="sm" onClick={generateDoc}>
                    <Wand2 className="mr-1.5 size-4" /> {w.generateLinkedDoc}
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">{task.document_key}</span>
                )}
              </div>
            </div>
          ) : null}

          <Field label={w.resolution}>
            <Textarea rows={3} value={form.resolution} disabled={locked} placeholder={w.resolutionHint} onChange={(e) => setForm({ ...form, resolution: e.target.value })} />
          </Field>
          {task?.completed_at ? (
            <p className="text-xs text-muted-foreground">
              {w.completedOn}: {fmtDate(task.completed_at)} {task.completed_by ? `· ${task.completed_by}` : ""}
            </p>
          ) : null}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {task && !locked && can("edit") ? (
            <>
              <Button variant="outline" onClick={() => void persist()}>{t.save}</Button>
              {task.status === "pending" ? (
                <Button variant="outline" onClick={() => void persist({ status: "in_progress" })}>{w.start}</Button>
              ) : null}
              <Button onClick={() => void persist({ status: "done" })}>
                <Check className="mr-1.5 size-4" /> {w.markDone}
              </Button>
            </>
          ) : null}
          {task && locked && can("edit") ? (
            <Button variant="outline" onClick={() => void persist({ status: "pending" })}>
              <RotateCcw className="mr-1.5 size-4" /> {w.reopen}
            </Button>
          ) : null}
          {!task ? <Button onClick={() => void persist()}>{t.create}</Button> : null}
          <Button variant="ghost" onClick={onClose}>{w.close}</Button>
        </DialogFooter>
      </DialogContent>
      {docOpen ? <DocumentDialog id={docOpen} onClose={() => { setDocOpen(null); void refresh(); }} t={x} w={w} can={can} /> : null}
    </Dialog>
  );
}
