import { ArrowRight, ShieldCheck } from "lucide-react";
import { SectionShell } from "./section-shell";
import { SourceNote } from "./source-note";
import { usePainCopy } from "@/i18n/pages/pain";
import { cn } from "@/lib/utils";

/**
 * Compact proof band for secondary pages: mechanism -> business consequence,
 * externally sourced market figures, and an explicit statement about what we
 * do NOT claim. No invented case studies or customer results.
 */
export function ProofBand({
  className,
  limit = 3,
}: {
  className?: string;
  limit?: number;
}) {
  const copy = usePainCopy();
  const t = copy.proof;

  return (
    <SectionShell className={cn("oix-hairline-top", className)}>
      <div className="max-w-3xl">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--oix-emerald)]">
          {t.eyebrow}
        </div>
        <h2 className="oix-display mt-4 text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.14]">
          {t.title}
        </h2>
        <p className="mt-5 text-[var(--oix-cream-dim)]">{t.intro}</p>
      </div>

      <ul className="mt-12 grid gap-px bg-[var(--oix-gold-line)]">
        {t.items.slice(0, limit).map((item) => (
          <li
            key={item.mechanism}
            className="grid gap-4 bg-[var(--oix-bg-deep)] p-6 md:grid-cols-[1fr_auto_1.2fr] md:items-center md:p-7"
          >
            <span className="text-sm font-semibold leading-snug text-[var(--oix-cream)]">
              {item.mechanism}
            </span>
            <ArrowRight
              className="hidden h-4 w-4 text-[var(--oix-emerald)] md:block"
              strokeWidth={1.8}
              aria-hidden
            />
            <span className="text-sm leading-relaxed text-[var(--oix-cream-dim)]">
              {item.consequence}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-10 grid gap-px bg-[var(--oix-gold-line)] md:grid-cols-3">
        {copy.hero.costs.map((c) => (
          <div key={c.value} className="bg-[var(--oix-bg-deep)] p-6">
            <dt className="oix-display text-3xl text-[var(--oix-emerald)]">{c.value}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-[var(--oix-cream-dim)]">{c.label}</dd>
            <SourceNote className="mt-3" label={copy.sourceLabel} sources={[c.source]} />
          </div>
        ))}
      </dl>

      <div className="mt-10 max-w-3xl border-t border-[var(--oix-gold-line)] pt-8">
        <h3 className="flex items-center gap-2 oix-display text-lg">
          <ShieldCheck className="h-4 w-4 text-[var(--oix-emerald)]" strokeWidth={1.7} />
          {t.honest}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--oix-cream-dim)]">{t.honestBody}</p>
      </div>
    </SectionShell>
  );
}
