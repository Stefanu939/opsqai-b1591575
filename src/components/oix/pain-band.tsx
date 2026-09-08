import { Link } from "@tanstack/react-router";
import { ArrowRight, AlertTriangle, Check } from "lucide-react";
import { SectionShell } from "./section-shell";
import { usePagePain, type PagePainKey } from "@/i18n/pages/page-pain";
import { cn } from "@/lib/utils";

/**
 * Reusable pain band for secondary public pages: names the loss first,
 * pairs each cost with what the shipped product does, then routes to the
 * one dominant offer (30-day pilot) and the loss calculator.
 *
 * Uses semantic tokens only, so it reads correctly on both the dark
 * editorial pages and the lighter marketing pages.
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
    <SectionShell className={cn("border-t border-border", className)}>
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-primary" strokeWidth={1.6} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.eyebrow}
          </span>
        </div>
        <h2 className="mt-6 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-foreground md:text-4xl">
          {t.title}
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">{t.intro}</p>
      </div>

      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
        {t.items.map((item) => (
          <li key={item.cost} className="flex flex-col bg-card p-6 md:p-7">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-destructive">
              {t.costLabel}
            </div>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-foreground">
              {item.cost}
            </p>
            <div className="my-6 h-px w-full bg-border" />
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              <Check className="h-3.5 w-3.5" strokeWidth={2} />
              {t.fixLabel}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.fix}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          to="/pilot"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t.primary}
          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
        </Link>
        <a
          href={calculatorHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          {t.secondary}
        </a>
      </div>
    </SectionShell>
  );
}
