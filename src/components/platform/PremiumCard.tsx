import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: string;
  title?: ReactNode;
  action?: ReactNode;
  hairline?: boolean;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

export const PremiumCard = forwardRef<HTMLDivElement, PremiumCardProps>(
  function PremiumCard(
    { eyebrow, title, action, hairline = true, hover = false, padding = "md", className, children, ...rest },
    ref,
  ) {
    const pad =
      padding === "sm" ? "p-4" : padding === "lg" ? "p-6 md:p-7" : "p-5";
    return (
      <div
        ref={ref}
        className={cn(
          "mc-surface relative",
          hairline && "mc-hairline",
          hover && "mc-surface-hover",
          pad,
          className,
        )}
        {...rest}
      >
        {(eyebrow || title || action) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {eyebrow && <div className="mc-eyebrow mb-1">{eyebrow}</div>}
              {title && (
                <div className="mc-heading truncate text-base font-semibold text-[var(--mc-fg)]">
                  {title}
                </div>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    );
  },
);
