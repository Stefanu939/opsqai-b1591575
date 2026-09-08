// OPSQAI HR — small shared UI pieces for the HR workspaces.
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EmployeeOption {
  id: string;
  label: string;
  status?: string;
}

/** Searchable employee picker (name / employee number). */
export function EmployeePicker({
  employees,
  value,
  onChange,
  placeholder,
  empty,
  className,
  limit = 8,
}: {
  employees: EmployeeOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder: string;
  empty: string;
  className?: string;
  limit?: number;
}) {
  const [term, setTerm] = useState("");
  const selected = employees.find((e) => e.id === value) ?? null;
  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    const list = q ? employees.filter((e) => e.label.toLowerCase().includes(q)) : employees;
    return list.slice(0, limit);
  }, [employees, term, limit]);

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-8"
          value={term}
          placeholder={placeholder}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">{selected.label}</span>
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => onChange(null)}>
            ×
          </button>
        </div>
      ) : null}
      <ul className="grid max-h-56 gap-1 overflow-auto">
        {results.length === 0 ? <li className="px-1 text-xs text-muted-foreground">{empty}</li> : null}
        {results.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onChange(e.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted",
                e.id === value && "bg-muted",
              )}
            >
              <span className="truncate">{e.label}</span>
              {e.status ? <span className="text-xs text-muted-foreground">{e.status}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={cn("h-2 w-full rounded-full bg-muted", className)}>
      <div className={cn("h-2 rounded-full", pct >= 100 ? "bg-primary" : "bg-primary/70")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export const selectCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

export function StatCell({ label, value, tone }: { label: string; value: number | string; tone?: "critical" | "warn" | "ok" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold",
          tone === "critical" && "text-destructive",
          tone === "warn" && "text-amber-500",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function fmtDate(v: string | null | undefined) {
  return v ? v.slice(0, 10) : "—";
}
