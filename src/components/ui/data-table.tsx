import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { LucideIcon } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
  };
  className?: string;
}

/**
 * DataTable — v2 primitive. Enterprise table with real data only.
 * When rows is empty, renders the required EmptyState with an action.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="animate-pulse divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-3 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-3 w-40 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0 && empty) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-xs",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-1" style={{ backgroundColor: "var(--surface-1)" }}>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-surface-1",
                )}
                style={onRowClick ? undefined : undefined}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-3 text-foreground",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.className,
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
