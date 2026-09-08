import { ArrowRight, ShieldCheck } from "lucide-react";
import { SectionShell } from "./section-shell";
import { SourceNote } from "./source-note";
import { usePainCopy } from "@/i18n/pages/pain";
import { cn } from "@/lib/utils";

/** Mechanism → business consequence, plus an explicit honesty statement. */
export function ProofMap({ className }: { className?: string }) {
  const copy = usePainCopy();
  const t = copy.proof;
  return (
    <SectionShell className={cn("border-t border-border", className)}>
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {t.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {t.title}
        </h2>
        <p className="mt-4 text-muted-foreground">{t.intro}</p>
      </div>

      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border">
        {t.items.map((item) => (
          <li key={item.mechanism} className="grid gap-4 bg-card p-6 md:grid-cols-[1fr_auto_1.2fr] md:items-center md:p-7">
            <span className="text-sm font-semibold leading-snug text-foreground">
              {item.mechanism}
            </span>
            <ArrowRight
              className="hidden h-4 w-4 text-primary md:block"
              strokeWidth={1.8}
              aria-hidden
            />
            <span className="text-sm leading-relaxed text-muted-foreground">
              {item.consequence}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-6 rounded-xl border border-border bg-secondary/30 p-6 md:grid-cols-2 md:p-8">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.7} />
            {t.honest}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.honestBody}</p>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            {copy.risk.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.risk.body}</p>
          <ul className="mt-4 space-y-2">
            {copy.risk.points.map((p) => (
              <li key={p} className="text-sm text-foreground/90">
                — {p}
              </li>
            ))}
          </ul>
          <SourceNote className="mt-4" label={copy.sourcesLabel} sources={copy.risk.sources} />
        </div>
      </div>
    </SectionShell>
  );
}
