import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState — v2 primitive. Used everywhere data is missing.
 * No mock data anywhere; every empty list uses this.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-1 px-6 py-12 text-center",
        className,
      )}
      style={{ backgroundColor: "var(--surface-1)" }}
    >
      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-muted-foreground shadow-xs">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1">
        <div className="font-display text-base font-semibold text-foreground">
          {title}
        </div>
        {description && (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
