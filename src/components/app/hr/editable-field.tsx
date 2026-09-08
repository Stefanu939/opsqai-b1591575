// OPSQAI HR — click-to-edit field used across the employee file.
import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { selectCls } from "./shared";

export function EditableField({
  label,
  value,
  type = "text",
  options,
  editable,
  onSave,
}: {
  label: string;
  value: string | null;
  type?: "text" | "date" | "email" | "long" | "select";
  options?: Array<{ value: string; label: string }>;
  editable: boolean;
  onSave: (next: string | null) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [busy, setBusy] = useState(false);

  const start = () => {
    if (!editable) return;
    setDraft(value ?? "");
    setEditing(true);
  };

  const commit = () => {
    setBusy(true);
    void onSave(draft.trim() === "" ? null : draft.trim()).finally(() => {
      setBusy(false);
      setEditing(false);
    });
  };

  return (
    <div className="group rounded-lg border border-border/60 bg-card/50 px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {editable && !editing ? (
          <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
        ) : null}
      </p>
      {editing ? (
        <div className="mt-1 flex items-start gap-2">
          {type === "long" ? (
            <Textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} />
          ) : type === "select" ? (
            <select className={selectCls} value={draft} onChange={(e) => setDraft(e.target.value)}>
              <option value="">—</option>
              {(options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <Input type={type} value={draft} onChange={(e) => setDraft(e.target.value)} />
          )}
          <Button size="sm" variant="ghost" disabled={busy} onClick={commit}>
            <Check className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className={`block w-full truncate text-left text-sm ${editable ? "cursor-text hover:underline" : "cursor-default"}`}
        >
          {value?.trim()
            ? type === "select"
              ? (options ?? []).find((o) => o.value === value)?.label ?? value
              : value
            : "—"}
        </button>
      )}
    </div>
  );
}
