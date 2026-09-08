import { Check, X } from "lucide-react";
import { SectionShell } from "./section-shell";
import { usePainCopy } from "@/i18n/pages/pain";
import { cn } from "@/lib/utils";

/**
 * "Before vs after" recognition section. The left column is the visitor's
 * current reality, the right column is what the shipped product does today.
 */
export function BeforeAfter({ className }: { className?: string }) {
  const t = usePainCopy().beforeAfter;
  return (
    <SectionShell id="before-after" className={cn("border-t border-border", className)}>
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {t.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {t.title}
        </h2>
        <p className="mt-4 text-muted-foreground">{t.intro}</p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-6 md:p-8">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-destructive">
            {t.beforeTitle}
          </h3>
          <ul className="mt-6 space-y-4">
            {t.before.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-6 md:p-8">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
            {t.afterTitle}
          </h3>
          <ul className="mt-6 space-y-4">
            {t.after.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">{t.note}</p>
    </SectionShell>
  );
}
