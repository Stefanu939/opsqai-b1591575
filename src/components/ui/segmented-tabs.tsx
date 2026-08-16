import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * SegmentedTabs — compact filter/tab control used across /app surfaces.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-[background-color,color,box-shadow] duration-150",
              size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
              active
                ? "bg-card text-foreground shadow-xs ring-1 ring-gold-line"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60",
            )}
          >
            {o.label}
            {typeof o.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  active ? "bg-gold-soft text-gold" : "bg-muted text-muted-foreground",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
