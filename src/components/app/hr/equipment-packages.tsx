// OPSQAI HR — predefined + custom equipment packages (safety, hardware, access…)
// issued to an employee in one step.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Package, Plus, Send, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteHrAssetPackage, issueHrAssetPackage, saveHrAssetPackage } from "@/lib/hr-ws.functions";
import type { HrExtUi } from "@/i18n/pages/hr-ext";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import { useHrExtRefresh } from "./use-hr-ext";
import { useHrAssetPackages } from "./use-hr-ws";
import { EmployeePicker, Field, selectCls, type EmployeeOption } from "./shared";

type Target = { builtInKey?: string; packageId?: string; label: string; items: Array<{ name: string; category: string }> };

export function EquipmentPackages({ t, w, employees, can }: { t: HrExtUi; w: HrWsUi; employees: EmployeeOption[]; can: (g: string) => boolean }) {
  const query = useHrAssetPackages();
  const refresh = useHrExtRefresh();
  const issue = useServerFn(issueHrAssetPackage);
  const save = useServerFn(saveHrAssetPackage);
  const remove = useServerFn(deleteHrAssetPackage);
  const [target, setTarget] = useState<Target | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id?: string; name: string; category: string; items: Array<{ name: string; category: string }> } | null>(null);
  const [newItem, setNewItem] = useState("");

  if (query.isPending) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (query.error) return null;
  const data = query.data!;

  const runIssue = () => {
    if (!target) return;
    void issue({ data: { builtInKey: target.builtInKey, packageId: target.packageId, employeeId } })
      .then((r) => {
        toast.success(`${w.issued} · ${r.created}`);
        setTarget(null);
        setEmployeeId(null);
        void refresh();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const Card = ({ p, onDelete }: { p: Target & { category: string }; onDelete?: () => void }) => (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{p.category}</Badge>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.label}</span>
        {onDelete ? (
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        ) : null}
        {can("create") ? (
          <Button size="sm" onClick={() => setTarget(p)}>
            <Send className="mr-1.5 size-4" /> {w.issuePackage}
          </Button>
        ) : null}
      </div>
      <p className="mt-1.5 truncate text-xs text-muted-foreground">{p.items.map((i) => i.name).join(" · ")}</p>
    </div>
  );

  return (
    <Panel
      icon={Package}
      title={w.packages}
      actions={
        can("create") ? (
          <Button size="sm" variant="outline" onClick={() => setEditor({ name: "", category: data.categories[0] ?? "other", items: [] })}>
            <Plus className="mr-1.5 size-4" /> {w.newPackage}
          </Button>
        ) : null
      }
    >
      <p className="mb-2 text-xs font-medium text-muted-foreground">{w.builtInPackages}</p>
      <div className="grid gap-2 lg:grid-cols-2">
        {data.builtIn.map((p) => (
          <Card key={p.key} p={{ builtInKey: p.key, label: p.label, category: p.category, items: p.items }} />
        ))}
      </div>
      {data.packages.length > 0 ? (
        <>
          <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">{w.savedPackages}</p>
          <div className="grid gap-2 lg:grid-cols-2">
            {data.packages.map((p) => (
              <Card
                key={p.id}
                p={{ packageId: p.id, label: p.name, category: p.category, items: p.items }}
                onDelete={can("delete") ? () => void remove({ data: { id: p.id } }).then(() => void refresh()).catch((e: Error) => toast.error(e.message)) : undefined}
              />
            ))}
          </div>
        </>
      ) : null}

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{w.issuePackage} · {target?.label}</DialogTitle>
          </DialogHeader>
          <ul className="mb-2 grid gap-1 text-sm">
            {target?.items.map((i) => (
              <li key={i.name} className="flex justify-between rounded-md border border-border/50 px-2 py-1">
                <span>{i.name}</span>
                <span className="text-xs text-muted-foreground">{i.category}</span>
              </li>
            ))}
          </ul>
          <Field label={w.issueTo}>
            <EmployeePicker employees={employees} value={employeeId} onChange={setEmployeeId} placeholder={w.searchEmployee} empty={w.noResults} limit={5} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>{t.cancel}</Button>
            <Button onClick={runIssue}>{w.issuePackage}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editor)} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{w.newPackage}</DialogTitle>
          </DialogHeader>
          {editor ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={w.packageName}>
                  <Input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
                </Field>
                <Field label={t.category}>
                  <select className={selectCls} value={editor.category} onChange={(e) => setEditor({ ...editor, category: e.target.value })}>
                    {data.categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={w.packageItems}>
                <ul className="grid gap-1">
                  {editor.items.map((i, idx) => (
                    <li key={`${i.name}-${idx}`} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1 text-sm">
                      <span className="flex-1">{i.name}</span>
                      <button type="button" className="text-xs text-muted-foreground" onClick={() => setEditor({ ...editor, items: editor.items.filter((_, j) => j !== idx) })}>×</button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Input value={newItem} placeholder={w.addItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newItem.trim()) { e.preventDefault(); setEditor({ ...editor, items: [...editor.items, { name: newItem.trim(), category: editor.category }] }); setNewItem(""); } }} />
                  <Button variant="outline" disabled={!newItem.trim()} onClick={() => { setEditor({ ...editor, items: [...editor.items, { name: newItem.trim(), category: editor.category }] }); setNewItem(""); }}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>{t.cancel}</Button>
            <Button
              disabled={!editor?.name.trim() || (editor?.items.length ?? 0) === 0}
              onClick={() =>
                editor &&
                void save({ data: { id: editor.id, name: editor.name.trim(), category: editor.category, items: editor.items } })
                  .then(() => { toast.success(t.saved); setEditor(null); void refresh(); })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
