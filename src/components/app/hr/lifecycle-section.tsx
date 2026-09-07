// OPSQAI HR — onboarding / offboarding checklists that expand into HR tasks.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ListChecks, Play, Plus, Trash2 } from "lucide-react";
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
import { deleteHrChecklist, runHrChecklist, saveHrChecklist } from "@/lib/hr-ext.functions";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import { useHrChecklists, useHrExtRefresh } from "./use-hr-ext";

interface Draft {
  kind: "onboarding" | "offboarding";
  name: string;
  items: Array<{ title: string; team: string; offsetDays: string }>;
}

const emptyDraft: Draft = {
  kind: "onboarding",
  name: "",
  items: [{ title: "", team: "", offsetDays: "0" }],
};

export function LifecycleSection({ t }: { t: HrExtUi }) {
  const query = useHrChecklists();
  const refresh = useHrExtRefresh();
  const save = useServerFn(saveHrChecklist);
  const remove = useServerFn(deleteHrChecklist);
  const run = useServerFn(runHrChecklist);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [runFor, setRunFor] = useState<{ id: string; employeeId: string; date: string } | null>(null);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.lifecycle} description={(query.error as Error).message} />;
  }
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);

  const submit = () => {
    const items = draft.items
      .filter((i) => i.title.trim())
      .map((i) => ({
        title: i.title.trim(),
        team: i.team.trim() || null,
        offsetDays: Number(i.offsetDays || 0),
      }));
    if (!draft.name.trim() || items.length === 0) {
      toast.error(t.checklistName);
      return;
    }
    void save({ data: { kind: draft.kind, name: draft.name.trim(), items } })
      .then(() => {
        toast.success(t.saved);
        setOpen(false);
        setDraft(emptyDraft);
        void refresh();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  return (
    <div className="grid gap-6">
      <Panel
        icon={ListChecks}
        title={t.checklists}
        actions={
          can("create") ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 size-4" /> {t.newChecklist}
            </Button>
          ) : null
        }
      >
        {data.checklists.length === 0 ? (
          <EmptyState title={t.noChecklists} description={t.noChecklistsBody} />
        ) : (
          <ul className="divide-y divide-border/60">
            {data.checklists.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(Array.isArray(c.items) ? c.items.length : 0)} {t.items.toLowerCase()}
                    {c.position_name ? ` · ${c.position_name}` : ""}
                  </p>
                </div>
                <Badge variant="secondary">
                  {c.kind === "onboarding" ? t.onboarding : t.offboarding}
                </Badge>
                {can("create") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRunFor({ id: c.id, employeeId: "", date: "" })}
                  >
                    <Play className="mr-1.5 size-4" /> {t.runChecklist}
                  </Button>
                ) : null}
                {can("delete") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void remove({ data: { id: c.id } })
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.newChecklist}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="hr-cl-name">{t.checklistName}</Label>
                <Input
                  id="hr-cl-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hr-cl-kind">{t.kind}</Label>
                <select
                  id="hr-cl-kind"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={draft.kind}
                  onChange={(e) =>
                    setDraft({ ...draft, kind: e.target.value as Draft["kind"] })
                  }
                >
                  <option value="onboarding">{t.onboarding}</option>
                  <option value="offboarding">{t.offboarding}</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t.items}</Label>
              {draft.items.map((item, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_150px_120px]">
                  <Input
                    placeholder={t.itemTitle}
                    value={item.title}
                    onChange={(e) => {
                      const items = [...draft.items];
                      items[i] = { ...item, title: e.target.value };
                      setDraft({ ...draft, items });
                    }}
                  />
                  <Input
                    placeholder={t.team}
                    value={item.team}
                    onChange={(e) => {
                      const items = [...draft.items];
                      items[i] = { ...item, team: e.target.value };
                      setDraft({ ...draft, items });
                    }}
                  />
                  <Input
                    type="number"
                    placeholder={t.offsetDays}
                    value={item.offsetDays}
                    onChange={(e) => {
                      const items = [...draft.items];
                      items[i] = { ...item, offsetDays: e.target.value };
                      setDraft({ ...draft, items });
                    }}
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="justify-self-start"
                onClick={() =>
                  setDraft({
                    ...draft,
                    items: [...draft.items, { title: "", team: "", offsetDays: "0" }],
                  })
                }
              >
                <Plus className="mr-1.5 size-4" /> {t.addItem}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={submit}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(runFor)} onOpenChange={(o) => !o && setRunFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.runChecklist}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="hr-run-emp">{t.employee}</Label>
              <select
                id="hr-run-emp"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={runFor?.employeeId ?? ""}
                onChange={(e) =>
                  setRunFor(runFor ? { ...runFor, employeeId: e.target.value } : runFor)
                }
              >
                <option value="">{t.none}</option>
                {data.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hr-run-date">{t.anchorDate}</Label>
              <Input
                id="hr-run-date"
                type="date"
                value={runFor?.date ?? ""}
                onChange={(e) => setRunFor(runFor ? { ...runFor, date: e.target.value } : runFor)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRunFor(null)}>
              {t.cancel}
            </Button>
            <Button
              disabled={!runFor?.employeeId}
              onClick={() =>
                void run({
                  data: {
                    checklistId: runFor!.id,
                    employeeId: runFor!.employeeId,
                    ...(runFor!.date ? { anchorDate: runFor!.date } : {}),
                  },
                })
                  .then((r) => {
                    toast.success(`${t.started} (${r.created})`);
                    setRunFor(null);
                    void refresh();
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t.runChecklist}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
