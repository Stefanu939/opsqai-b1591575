import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  className?: string;
}

/**
 * PageHeader — v2 enterprise page header.
 * One per page, top of the content area.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 mb-6 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"
          >
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.to ? (
                  <Link
                    to={c.to}
                    className="hover:text-foreground transition-colors"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{c.label}</span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl font-semibold text-foreground md:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
