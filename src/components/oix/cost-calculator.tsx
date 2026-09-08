import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SectionShell } from "./section-shell";
import { usePainCopy } from "@/i18n/pages/pain";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

const WORKING_DAYS = 220;

const localeMap: Record<string, string> = { en: "en-IE", de: "de-DE", ro: "ro-RO" };

/**
 * Loss calculator. Everything is computed client-side from the visitor's own
 * inputs — we never present a modelled figure as an OPSQAI result or promise
 * a saving.
 */
export function CostCalculator({ className }: { className?: string }) {
  const t = usePainCopy().calculator;
  const { lang } = useT();
  const locale = localeMap[lang] ?? "en-IE";

  const [employees, setEmployees] = useState(50);
  const [hourlyCost, setHourlyCost] = useState(35);
  const [minutes, setMinutes] = useState(25);
  const [leavers, setLeavers] = useState(8);
  const [leaverCost, setLeaverCost] = useState(15000);

  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }),
    [locale],
  );
  const number = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );

  const hours = (employees * minutes * WORKING_DAYS) / 60;
  const searchCost = hours * hourlyCost;
  const turnoverCost = leavers * leaverCost;
  const total = searchCost + turnoverCost;

  const fields: Array<{ label: string; value: number; set: (n: number) => void; step: number }> = [
    { label: t.fields.employees, value: employees, set: setEmployees, step: 1 },
    { label: t.fields.hourlyCost, value: hourlyCost, set: setHourlyCost, step: 1 },
    { label: t.fields.minutes, value: minutes, set: setMinutes, step: 5 },
    { label: t.fields.leavers, value: leavers, set: setLeavers, step: 1 },
    { label: t.fields.leaverCost, value: leaverCost, set: setLeaverCost, step: 500 },
  ];

  return (
    <SectionShell id="cost" className={cn("border-t border-border", className)}>
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {t.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {t.title}
        </h2>
        <p className="mt-4 text-muted-foreground">{t.intro}</p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-5 rounded-xl border border-border bg-card p-6 md:p-8">
          {fields.map((f) => (
            <label key={f.label} className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {f.label}
              </span>
              <input
                type="number"
                min={0}
                step={f.step}
                value={f.value}
                onChange={(e) => f.set(Math.max(0, Number(e.target.value) || 0))}
                className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
          ))}
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t.assumption}</p>
        </div>

        <div className="flex flex-col rounded-xl border border-primary/30 bg-primary/[0.04] p-6 md:p-8">
          <dl className="grid gap-5">
            <Row label={t.results.hours} value={number.format(hours)} />
            <Row label={t.results.searchCost} value={money.format(searchCost)} />
            <Row label={t.results.turnoverCost} value={money.format(turnoverCost)} />
          </dl>
          <div className="mt-6 border-t border-border pt-6">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              {t.results.total}
            </dt>
            <dd className="mt-2 font-display text-4xl font-semibold text-foreground">
              {money.format(total)}
            </dd>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{t.disclaimer}</p>
          <Link
            to="/pilot"
            className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.cta}
            <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-display text-xl font-semibold text-foreground">{value}</dd>
    </div>
  );
}
