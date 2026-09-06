// Standalone add/edit dialog driven by the same field descriptors the register
// tables use. Lets any surface (e.g. the fleet board quick-add buttons) open a
// record form without rendering a whole register table.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { FieldDef } from "./field-types";

export function RecordDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  labels,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  initial?: Record<string, string>;
  labels: { save: string; cancel: string };
  onSave: (values: Record<string, unknown>) => Promise<unknown>;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial ?? {});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValues(initial ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = values[f.key] ?? "";
        if (f.kind === "number") payload[f.key] = raw === "" ? null : Number(raw);
        else payload[f.key] = raw === "" ? null : raw;
      }
      await onSave(payload);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div
              key={f.key}
              className={f.full || f.kind === "textarea" ? "sm:col-span-2" : ""}
            >
              <Label className="text-xs">{f.label}</Label>
              {f.kind === "textarea" ? (
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={values[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
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
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {labels.cancel}
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
