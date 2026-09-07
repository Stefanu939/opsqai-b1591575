// OPSQAI HR — incidents, warnings and workplace accidents.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { deleteHrIncident, saveHrIncident } from "@/lib/hr-ext.functions";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import { useHrExtRefresh, useHrIncidents } from "./use-hr-ext";

export function IncidentsSection({ t }: { t: HrExtUi }) {
  const query = useHrIncidents();
  const refresh = useHrExtRefresh();
  const save = useServerFn(saveHrIncident);
  const remove = useServerFn(deleteHrIncident);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    employee_id: "",
    kind: "incident" as "incident" | "warning" | "accident",
    severity: "low" as "low" | "medium" | "high",
    title: "",
    description: "",
    action_taken: "",
    occurred_on: "",
  });

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.incidents} description={(query.error as Error).message} />;
  }
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);
  const kindLabel = (k: string) => (k === "warning" ? t.warning : k === "accident" ? t.accident : t.incident);
  const sevLabel = (s: string) => (s === "high" ? t.high : s === "medium" ? t.medium : t.low);

  return (
    <div className="grid gap-6">
      <Panel
        icon={AlertTriangle}
        title={t.incidents}
        actions={
          can("create") ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 size-4" /> {t.newIncident}
            </Button>
          ) : null
        }
      >
        {data.incidents.length === 0 ? (
          <EmptyState title={t.noIncidents} description={t.noIncidentsBody} />
        ) : (
          <ul className="divide-y divide-border/60">
            {data.incidents.map((i) => (
              <li key={i.id} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[i.occurred_on, i.employee_no, i.employee_name].filter(Boolean).join(" · ")}
                  </p>
                  {i.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>
                  ) : null}
                  {i.action_taken ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.actionTaken}: {i.action_taken}
                    </p>
                  ) : null}
                </div>
                <Badge variant="secondary">{kindLabel(i.kind)}</Badge>
                <Badge variant={i.severity === "high" ? "destructive" : "outline"}>
                  {sevLabel(i.severity)}
                </Badge>
                {can("delete") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void remove({ data: { id: i.id } })
                        .then(() => refresh())
                        .catch((e: Error) => toast.error(e.message))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t.newIncident}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="hr-inc-emp">{t.employee}</Label>
              <select
                id="hr-inc-emp"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={draft.employee_id}
                onChange={(e) => setDraft({ ...draft, employee_id: e.target.value })}
              >
                <option value="">{t.none}</option>
                {data.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="hr-inc-kind">{t.kind}</Label>
                <select
                  id="hr-inc-kind"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value as typeof draft.kind })}
                >
                  <option value="incident">{t.incident}</option>
                  <option value="warning">{t.warning}</option>
                  <option value="accident">{t.accident}</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hr-inc-sev">{t.severity}</Label>
                <select
                  id="hr-inc-sev"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={draft.severity}
                  onChange={(e) =>
                    setDraft({ ...draft, severity: e.target.value as typeof draft.severity })
                  }
                >
                  <option value="low">{t.low}</option>
                  <option value="medium">{t.medium}</option>
                  <option value="high">{t.high}</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hr-inc-date">{t.occurredOn}</Label>
                <Input
                  id="hr-inc-date"
                  type="date"
                  value={draft.occurred_on}
                  onChange={(e) => setDraft({ ...draft, occurred_on: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-inc-title">{t.title}</Label>
              <Input
                id="hr-inc-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-inc-desc">{t.description}</Label>
              <Textarea
                id="hr-inc-desc"
                rows={4}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-inc-action">{t.actionTaken}</Label>
              <Textarea
                id="hr-inc-action"
                rows={3}
                value={draft.action_taken}
                onChange={(e) => setDraft({ ...draft, action_taken: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() =>
                void save({
                  data: {
                    employee_id: draft.employee_id || null,
                    kind: draft.kind,
                    severity: draft.severity,
                    title: draft.title.trim(),
                    description: draft.description.trim() || null,
                    action_taken: draft.action_taken.trim() || null,
                    occurred_on: draft.occurred_on || null,
                  },
                })
                  .then(() => {
                    toast.success(t.saved);
                    setOpen(false);
                    setDraft({ ...draft, title: "", description: "", action_taken: "" });
                    void refresh();
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
