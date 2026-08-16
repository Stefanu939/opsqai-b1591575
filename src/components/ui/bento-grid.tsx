import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * BentoGrid — the Self-Hosted "Command Deck" layout primitive.
 * A 12-column grid on desktop; children declare their own span via
 * `BentoItem` so a surface can mix hero panels, KPI tiles and charts.
 */
export function BentoGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:grid-cols-6 lg:grid-cols-12 lg:gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

type Span = 2 | 3 | 4 | 6 | 8 | 9 | 12;

const spanCls: Record<Span, string> = {
  2: "col-span-1 md:col-span-2 lg:col-span-2",
  3: "col-span-1 md:col-span-2 lg:col-span-3",
  4: "col-span-2 md:col-span-3 lg:col-span-4",
  6: "col-span-2 md:col-span-3 lg:col-span-6",
  8: "col-span-2 md:col-span-6 lg:col-span-8",
  9: "col-span-2 md:col-span-6 lg:col-span-9",
  12: "col-span-2 md:col-span-6 lg:col-span-12",
};

export function BentoItem({
  span = 4,
  index = 0,
  className,
  children,
}: {
  /** Desktop column span out of 12. */
  span?: Span;
  /** Stagger position — drives the entrance delay. */
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(spanCls[span], "oq-enter min-w-0", className)}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      {children}
    </div>
  );
}
