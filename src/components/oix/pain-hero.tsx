import { Link } from "@tanstack/react-router";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { SectionShell } from "./section-shell";
import { SourceNote } from "./source-note";
import { usePainCopy } from "@/i18n/pages/pain";

/**
 * Pain-first hero: names the operational problem before the technology,
 * with two CTAs (pilot, loss calculator) and three externally sourced
 * market figures. No invented customer results.
 */
export function PainHero() {
  const t = usePainCopy();
  return (
    <SectionShell className="pt-24 md:pt-32">
      <div className="max-w-4xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-primary" strokeWidth={1.6} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.hero.eyebrow}
          </span>
        </div>

        <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {t.hero.h1a}
          <br />
          {t.hero.h1b}{" "}
          <span className="italic text-primary">{t.hero.serifAccent}</span>
        </h1>

        <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {t.hero.intro}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            to="/pilot"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.hero.primary}
            <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
          </Link>
          <a
            href="#cost"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            {t.hero.secondary}
          </a>
          <Link
            to="/self-hosted"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.hero.tertiary}
          </Link>
        </div>
      </div>

      <dl className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
        {t.hero.costs.map((c) => (
          <div key={c.value} className="bg-card p-6">
            <dt className="font-display text-3xl font-semibold text-primary">{c.value}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.label}</dd>
            <SourceNote className="mt-3" label={t.sourceLabel} sources={[c.source]} />
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}
