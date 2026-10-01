import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useUiLabel } from "@/i18n/ui-labels";

interface PanelProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Elevated enterprise surface. Kept for API compatibility. */
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
  const tl = useUiLabel();
  return (
    <section
      className={cn(
         "relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-[0_0_32px_-12px_color-mix(in_oklch,var(--primary)_40%,transparent)]",
         glass && "bg-card",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
               <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10">
                 <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground">
                  {tl(title)}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {tl(description)}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("min-w-0 flex-1", flush ? "" : "p-5", bodyClassName)}>{children}</div>
      {footer && (
        <footer className="border-t border-border/60 px-5 py-2.5 text-xs text-muted-foreground">
          {footer}
        </footer>
      )}
    </section>
  );
}
