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
    <div className="oq-page relative min-h-full bg-background text-foreground">
      {/* Ambient command-deck backdrop — gold/primary aura behind the header. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            "radial-gradient(70% 100% at 12% 0%, color-mix(in oklab, var(--gold) 12%, transparent) 0%, transparent 70%), radial-gradient(60% 100% at 90% 0%, color-mix(in oklab, var(--primary) 12%, transparent) 0%, transparent 72%)",
        }}
      />
      <div
        className={cn(
          "relative mx-auto px-4 py-6 md:px-6 md:py-8",
          width === "wide" ? "max-w-7xl" : "max-w-none",
          className,
        )}
      >
        <div className="relative mb-5 overflow-hidden rounded-xl border border-border bg-card/70 px-4 py-4 shadow-xs oq-edge-gold backdrop-blur md:px-5 md:py-5">
          <PageHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            breadcrumbs={breadcrumbs}
            actions={actions}
            className="mb-0 border-b-0 pb-0"
          />
        </div>

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

