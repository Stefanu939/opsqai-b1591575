// OPSQAI HR — company equipment and assignment to employees.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Laptop, Plus, Trash2, Undo2 } from "lucide-react";
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
import { assignHrAsset, deleteHrAsset, saveHrAsset } from "@/lib/hr-ext.functions";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import { useHrAssets, useHrExtRefresh } from "./use-hr-ext";

export function EquipmentSection({ t }: { t: HrExtUi }) {
  const query = useHrAssets();
  const refresh = useHrExtRefresh();
  const save = useServerFn(saveHrAsset);
  const remove = useServerFn(deleteHrAsset);
  const assign = useServerFn(assignHrAsset);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: "", serial: "", notes: "" });

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.equipment} description={(query.error as Error).message} />;
  }
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);
  const statusLabel = (s: string) =>
    s === "assigned" ? t.assigned : s === "retired" ? t.retired : t.available;

  return (
    <div className="grid gap-6">
      <Panel
        icon={Laptop}
        title={t.equipment}
        actions={
          can("create") ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 size-4" /> {t.newAsset}
            </Button>
          ) : null
        }
      >
        {data.assets.length === 0 ? (
          <EmptyState title={t.noAssets} description={t.noAssetsBody} />
        ) : (
          <ul className="divide-y divide-border/60">
            {data.assets.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[a.category, a.serial, a.holder_name ? `${t.holder}: ${a.holder_name}` : null]
                      .filter(Boolean)
                      .join(" · ") || t.none}
                  </p>
                </div>
                <Badge variant={a.status === "assigned" ? "default" : "secondary"}>
                  {statusLabel(a.status)}
                </Badge>
                {can("edit") ? (
                  a.holder_employee_id ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void assign({ data: { assetId: a.id, employeeId: null } })
                          .then(() => refresh())
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      <Undo2 className="mr-1.5 size-4" /> {t.returnAsset}
                    </Button>
                  ) : (
                    <select
                      aria-label={t.assign}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value=""
                      onChange={(e) =>
                        e.target.value &&
                        void assign({ data: { assetId: a.id, employeeId: e.target.value } })
                          .then(() => refresh())
                          .catch((err: Error) => toast.error(err.message))
                      }
                    >
                      <option value="">{t.assign}…</option>
                      {data.employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.label}
                        </option>
                      ))}
                    </select>
                  )
                ) : null}
                {can("delete") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void remove({ data: { id: a.id } })
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.newAsset}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {(
              [
                ["name", t.assetName],
                ["category", t.category],
                ["serial", t.serial],
                ["notes", t.description],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={`hr-asset-${key}`}>{label}</Label>
                <Input
                  id={`hr-asset-${key}`}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() =>
                void save({
                  data: {
                    name: draft.name.trim(),
                    category: draft.category.trim() || null,
                    serial: draft.serial.trim() || null,
                    notes: draft.notes.trim() || null,
                  },
                })
                  .then(() => {
                    toast.success(t.saved);
                    setOpen(false);
                    setDraft({ name: "", category: "", serial: "", notes: "" });
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
