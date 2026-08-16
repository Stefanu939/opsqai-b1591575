import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Glass surface with a gold edge-light — for hero/feature panels. */
  glass?: boolean;
  /** Remove body padding (tables, lists that own their own padding). */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}

/**
 * Panel — the standard content container for every /app surface.
 * Header (icon + title + actions) over a bordered card body.
 */
export function Panel({
  title,
  description,
  icon: Icon,
  actions,
  footer,
  glass,
  flush,
  className,
  bodyClassName,
  children,
}: PanelProps) {
  return (
    <section
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs",
        glass && "oq-glass oq-edge-gold",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gold-line bg-gold-soft">
                <Icon className="h-3.5 w-3.5 text-gold" strokeWidth={1.75} />
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="truncate text-[13px] font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("min-w-0 flex-1", flush ? "" : "p-4", bodyClassName)}>{children}</div>
      {footer && (
        <footer className="border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
          {footer}
        </footer>
      )}
    </section>
  );
}
