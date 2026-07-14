import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

/**
 * SectionCard — v2 primitive. Neutral surface card.
 * Replaces `PremiumCard` from the retired Noir & Gold shell.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  padding = "md",
}: SectionCardProps) {
  const pad = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  }[padding];

  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card shadow-xs",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-sm font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={pad}>{children}</div>
    </section>
  );
}
