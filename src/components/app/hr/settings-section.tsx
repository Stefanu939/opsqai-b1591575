// OPSQAI HR — jurisdiction, employee numbering and reference data.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Plus, Settings, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteHrRef, saveHrRef, saveHrSettings } from "@/lib/hr.functions";
import type { HrCountry, HrRef } from "@/lib/hr/types";
import type { HrUi } from "@/i18n/pages/hr";
import { useHrOverview, useHrRefresh } from "./use-hr";

const COUNTRIES: Array<{ value: HrCountry; label: string }> = [
  { value: "de", label: "Deutschland (DE)" },
  { value: "ro", label: "România (RO)" },
  { value: "generic", label: "Generic / EU" },
];

export function HrSettingsSection({ t }: { t: HrUi }) {
  const query = useHrOverview();
  const refresh = useHrRefresh();
  const saveSettings = useServerFn(saveHrSettings);
  const [prefix, setPrefix] = useState("EMP");

  useEffect(() => {
    if (query.data?.settings.employee_prefix) setPrefix(query.data.settings.employee_prefix);
  }, [query.data?.settings.employee_prefix]);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.referenceData} description={(query.error as Error).message} />;
  }
  const data = query.data;
  if (!data) return <EmptyState title={t.referenceData} />;

  const canEdit = data.grants.includes("settings");

  return (
    <div className="grid gap-4">
      <Panel icon={Settings} title={t.referenceData} description={t.jurisdiction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>{t.jurisdiction}</Label>
            <Select
              value={data.settings.country}
              disabled={!canEdit}
              onValueChange={(v) =>
                void saveSettings({ data: { country: v as HrCountry } })
                  .then(() => {
                    toast.success(t.saved);
                    void refresh();
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hr-prefix">{t.employeeId}</Label>
            <div className="flex gap-2">
              <Input
                id="hr-prefix"
                value={prefix}
                disabled={!canEdit}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              />
              <Button
                variant="outline"
                disabled={!canEdit}
                onClick={() =>
                  void saveSettings({ data: { employee_prefix: prefix.trim() } })
                    .then(() => {
                      toast.success(t.saved);
                      void refresh();
                    })
                    .catch((e: Error) => toast.error(e.message))
                }
              >
                {t.save}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <RefPanel
          t={t}
          title={t.department}
          addLabel={t.addDepartment}
          kind="departments"
          items={data.refs.departments}
          canEdit={canEdit}
          onChanged={refresh}
        />
        <RefPanel
          t={t}
          title={t.position}
          addLabel={t.addPosition}
          kind="positions"
          items={data.refs.positions}
          canEdit={canEdit}
          onChanged={refresh}
        />
        <RefPanel
          t={t}
          title={t.location}
          addLabel={t.addLocation}
          kind="locations"
          items={data.refs.locations}
          canEdit={canEdit}
          onChanged={refresh}
        />
      </div>
    </div>
  );
}

function RefPanel({
  t,
  title,
  addLabel,
  kind,
  items,
  canEdit,
  onChanged,
}: {
  t: HrUi;
  title: string;
  addLabel: string;
  kind: "departments" | "positions" | "locations";
  items: HrRef[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const save = useServerFn(saveHrRef);
  const remove = useServerFn(deleteHrRef);
  const [name, setName] = useState("");

  return (
    <Panel icon={Building2} title={title}>
      {canEdit ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            void save({ data: { kind, name: name.trim() } })
              .then(() => {
                setName("");
                toast.success(t.saved);
                onChanged();
              })
              .catch((err: Error) => toast.error(err.message));
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={addLabel} />
          <Button type="submit" size="icon" variant="outline" aria-label={addLabel}>
            <Plus className="size-4" />
          </Button>
        </form>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-1.5 text-sm"
            >
              <span className="truncate text-foreground">{item.name}</span>
              {canEdit ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t.remove}
                  onClick={() =>
                    void remove({ data: { kind, id: item.id } })
                      .then(() => onChanged())
                      .catch((err: Error) => toast.error(err.message))
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
  );
}
