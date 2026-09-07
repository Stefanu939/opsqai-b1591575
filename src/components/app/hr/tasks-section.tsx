// OPSQAI HR — one task queue for onboarding, offboarding, expiries and approvals.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ListChecks, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteHrTask, saveHrTask } from "@/lib/hr.functions";
import type { HrUi } from "@/i18n/pages/hr";
import { useHrRefresh, useHrTasks } from "./use-hr";

export function TasksSection({ t }: { t: HrUi }) {
  const query = useHrTasks(false);
  const refresh = useHrRefresh();
  const save = useServerFn(saveHrTask);
  const remove = useServerFn(deleteHrTask);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", team: "", assigned_to: "", due_date: "" });

  const grants = query.data?.grants ?? [];
  const tasks = query.data?.tasks ?? [];

  const create = () => {
    if (!draft.title.trim()) {
      toast.error(t.taskTitle);
      return;
    }
    void save({
      data: {
        title: draft.title.trim(),
        team: draft.team.trim() || null,
        assigned_to: draft.assigned_to.trim() || null,
        due_date: draft.due_date.trim() || null,
        category: "general",
        status: "pending",
      },
    })
      .then(() => {
        toast.success(t.saved);
        setOpen(false);
        setDraft({ title: "", team: "", assigned_to: "", due_date: "" });
        void refresh();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.noTasks} description={(query.error as Error).message} />;
  }

  const field = (key: keyof typeof draft, label: string, type = "text") => (
    <div className="grid gap-1.5">
      <Label htmlFor={`hr-task-${key}`}>{label}</Label>
      <Input
        id={`hr-task-${key}`}
        type={type}
        value={draft[key]}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <Panel
      icon={ListChecks}
      title={t.tasks}
      actions={
        grants.includes("create") ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            {t.newTask}
          </Button>
        ) : null
      }
    >
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noTasks}</p>
      ) : (
        <ul className="grid gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    task.employee_no,
                    task.team,
                    task.assigned_to,
                    task.due_date ? task.due_date.slice(0, 10) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={task.status === "done" ? "secondary" : "default"}>
                  {t.statuses[task.status] ?? task.status}
                </Badge>
                {grants.includes("edit") && task.status !== "done" ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t.markDone}
                    onClick={() =>
                      void save({
                        data: {
                          id: task.id,
                          title: task.title,
                          employee_id: task.employee_id,
                          team: task.team,
                          assigned_to: task.assigned_to,
                          due_date: task.due_date,
                          category: task.category,
                          status: "done",
                        },
                      })
                        .then(() => void refresh())
                        .catch((e: Error) => toast.error(e.message))
                    }
                  >
                    <Check className="size-4" />
                  </Button>
                ) : null}
                {grants.includes("delete") ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t.remove}
                    onClick={() =>
                      void remove({ data: { id: task.id } })
                        .then(() => void refresh())
                        .catch((e: Error) => toast.error(e.message))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.newTask}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {field("title", t.taskTitle)}
            {field("team", t.team)}
            {field("assigned_to", t.assignedTo)}
            {field("due_date", t.dueDate, "date")}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={create}>{t.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
