import { ArrowRight, AlertTriangle, Check } from "lucide-react";
import { SectionShell } from "./section-shell";
import { OixButton } from "./buttons";
import { usePagePain, type PagePainKey } from "@/i18n/pages/page-pain";
import { cn } from "@/lib/utils";

/**
 * Reusable pain band for secondary public pages: names the loss first,
 * pairs each cost with what the shipped product does, then routes to the
 * one dominant offer (30-day pilot) and the loss calculator.
 */
export function PainBand({
  page,
  calculatorHref = "/pricing#cost",
  className,
}: {
  page: PagePainKey;
  calculatorHref?: string;
  className?: string;
}) {
  const t = usePagePain(page);

  return (
    <SectionShell className={cn("oix-hairline-top", className)}>
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--oix-border-strong)] px-3 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--oix-emerald)]" strokeWidth={1.6} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--oix-cream-dim)]">
            {t.eyebrow}
          </span>
        </div>
        <h2 className="oix-display mt-6 text-[clamp(1.6rem,3.2vw,2.75rem)] leading-[1.12]">
          {t.title}
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-[var(--oix-cream-dim)]">{t.intro}</p>
      </div>

      <ul className="mt-12 grid gap-px bg-[var(--oix-gold-line)] md:grid-cols-3">
        {t.items.map((item) => (
          <li key={item.cost} className="flex flex-col bg-[var(--oix-bg-deep)] p-7">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--oix-cream-dim)]">
              {t.costLabel}
            </div>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[var(--oix-cream)]">
              {item.cost}
            </p>
            <div className="my-6 h-px w-full bg-[var(--oix-gold-line)]" />
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--oix-emerald)]">
              <Check className="h-3.5 w-3.5" strokeWidth={2} />
              {t.fixLabel}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--oix-cream-dim)]">{item.fix}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <OixButton to="/pilot" variant="gold" withArrow>
          {t.primary}
        </OixButton>
        <a
          href={calculatorHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-[var(--oix-border-strong)] px-5 py-3 text-sm font-semibold text-[var(--oix-cream)] transition-colors hover:bg-[var(--oix-surface)]"
        >
          {t.secondary}
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </a>
      </div>
    </SectionShell>
  );
}
