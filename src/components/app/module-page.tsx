import type { ReactNode } from "react";
import { PageHeader, type Breadcrumb } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

/**
 * ModulePage — the required shell for every /app (Self-Hosted) module surface,
 * present and future. It guarantees the Command Deck look without per-page
 * redesign work: header, optional tab/filter rail, sticky toolbar and a
 * bento/panel content area.
 *
 * See docs/engineering/03-add-a-module.md for the module layout contract.
 */
export function ModulePage({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  tabs,
  toolbar,
  children,
  className,
  width = "wide",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  /** Primary actions, rendered in the header. */
  actions?: ReactNode;
  /** Segmented tabs / filters row directly under the header. */
  tabs?: ReactNode;
  /** Sticky secondary toolbar (search, upload, export). */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  width?: "wide" | "full";
}) {
  return (
    <div className="oq-page min-h-full bg-background text-foreground">
      <div
        className={cn(
          "mx-auto px-4 py-6 md:px-6 md:py-8",
          width === "wide" ? "max-w-7xl" : "max-w-none",
          className,
        )}
      >
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          breadcrumbs={breadcrumbs}
          actions={actions}
          className="mb-5 pb-5"
        />

        {tabs && <div className="mb-4 flex flex-wrap items-center gap-2">{tabs}</div>}

        {toolbar && (
          <div className="sticky top-0 z-10 -mx-1 mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/85 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            {toolbar}
          </div>
        )}

        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
