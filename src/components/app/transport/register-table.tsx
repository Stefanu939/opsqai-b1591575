// Generic register surface for the Transport workspace: a table plus an
// add/edit dialog driven by field descriptors, with optional CSV export.
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColumnDef, FieldDef } from "./field-types";

export interface RegisterTableProps<T extends { id: string }> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  rows: T[];
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  canEdit: boolean;
  emptyTitle: string;
  emptyBody?: string;
  labels: {
    add: string;
    edit: string;
    save: string;
    cancel: string;
    remove: string;
    export: string;
    actions: string;
  };
  onSave: (values: Record<string, unknown>, id?: string) => Promise<unknown>;
  onDelete?: (id: string) => Promise<unknown>;
  onExport?: () => void;
  extraActions?: ReactNode;
  rowActions?: (row: T) => ReactNode;
}

function toFormValues<T extends { id: string }>(row: T | null, fields: FieldDef[]) {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const raw = row ? (row as unknown as Record<string, unknown>)[f.key] : undefined;
    if (raw == null) {
      out[f.key] = "";
    } else if (f.kind === "date" && typeof raw === "string") {
      out[f.key] = raw.slice(0, 10);
    } else if (f.kind === "datetime" && typeof raw === "string") {
      out[f.key] = raw.slice(0, 16);
    } else {
      out[f.key] = String(raw);
    }
  }
  return out;
}

export function RegisterTable<T extends { id: string }>({
  title,
  description,
  icon,
  rows,
  columns,
  fields,
  canEdit,
  emptyTitle,
  emptyBody,
  labels,
  onSave,
  onDelete,
  onExport,
  extraActions,
  rowActions,
}: RegisterTableProps<T>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const start = (row: T | null) => {
    setEditing(row);
    setValues(toFormValues(row, fields));
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = values[f.key] ?? "";
        if (f.kind === "number") payload[f.key] = raw === "" ? null : Number(raw);
        else payload[f.key] = raw === "" ? null : raw;
      }
      await onSave(payload, editing?.id);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      icon={icon}
      title={title}
      description={description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {extraActions}
          {onExport ? (
            <Button size="sm" variant="outline" onClick={onExport}>
              <Download className="mr-1.5 size-3.5" />
              {labels.export}
            </Button>
          ) : null}
          {canEdit ? (
            <Button size="sm" onClick={() => start(null)}>
              <Plus className="mr-1.5 size-3.5" />
              {labels.add}
            </Button>
          ) : null}
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyBody} />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key}>{c.label}</TableHead>
                ))}
                <TableHead className="text-right">{labels.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className="align-top text-sm">
                      {c.render
                        ? c.render(row)
                        : String(
                            (row as unknown as Record<string, unknown>)[c.key] ?? "—",
                          )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right whitespace-nowrap">
                    {rowActions?.(row)}
                    {canEdit ? (
                      <Button size="icon" variant="ghost" onClick={() => start(row)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    ) : null}
                    {canEdit && onDelete ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => void onDelete(row.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? labels.edit : labels.add}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.full || f.kind === "textarea" ? "sm:col-span-2" : ""}>
                <Label className="text-xs">{f.label}</Label>
                {f.kind === "textarea" ? (
                  <Textarea
                    className="mt-1"
                    rows={3}
                    value={values[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                  />
                ) : f.kind === "select" ? (
                  <Select
                    value={values[f.key] ?? ""}
                    onValueChange={(val) =>
                      setValues((v) => ({ ...v, [f.key]: val === "__none" ? "" : val }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="mt-1"
                    type={
                      f.kind === "number"
                        ? "number"
                        : f.kind === "date"
                          ? "date"
                          : f.kind === "datetime"
                            ? "datetime-local"
                            : "text"
                    }
                    value={values[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
