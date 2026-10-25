import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, BarChart3, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { useBenchmarkCopy } from "@/i18n/pages/benchmarks";
import { OPERATIONAL_RESEARCH, type OperationalResearch } from "@/content/operational-research";
import { calculateOperationalImpact, type ImpactInputs } from "@/lib/operational-impact";
import { SectionShell } from "./section-shell";

export function OperationalBenchmarks({ compact = false }: { compact?: boolean }) {
  const t = useBenchmarkCopy();
  const { lang } = useT();
  return <SectionShell className="border-y border-border bg-surface-1">
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold text-primary">{t.eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">{t.title}</h2>
        <p className="mt-4 text-muted-foreground">{t.intro}</p>
      </div>
      {compact && <Button asChild variant="outline"><Link to="/studies">{t.all}<ArrowRight className="h-4 w-4" /></Link></Button>}
    </div>
    <div className="mt-10 grid gap-8 md:grid-cols-2">
      {OPERATIONAL_RESEARCH.map(study => <div key={study.slug} className="border-t border-primary/40 pt-6">
        <div className="font-display text-6xl font-semibold text-primary">{study.metric}</div>
        <p className="mt-4 max-w-lg text-lg leading-relaxed">{study.text[lang].finding}</p>
        <p className="mt-4 text-xs text-muted-foreground">{study.publisher} · {study.year}</p>
        {!compact && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{study.text[lang].population}</p>}
        <Button asChild variant="link" className="mt-4 h-auto px-0"><Link to="/blog/$slug" params={{ slug: study.slug }}>{t.article}<ArrowRight className="h-4 w-4" /></Link></Button>
        <div><a className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4" href={study.url} target="_blank" rel="noreferrer">{t.source}<ExternalLink className="h-3 w-3" /></a></div>
      </div>)}
    </div>
    <p className="mt-8 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">{t.distinction}</p>
  </SectionShell>;
}

export function OperationalSimulator() {
  const t = useBenchmarkCopy();
  const { lang } = useT();
  const [sector, setSector] = useState(0);
  const [inputs, setInputs] = useState<ImpactInputs>({ employees: 50, minutes: 20, hourlyCost: 35, workingDays: 220, recoveredMinutes: 5 });
  const result = calculateOperationalImpact(inputs);
  const locale = lang === "ro" ? "ro-RO" : lang === "de" ? "de-DE" : "en-IE";
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const keys: Array<keyof ImpactInputs> = ["employees", "minutes", "hourlyCost", "workingDays", "recoveredMinutes"];
  return <SectionShell id="simulation">
    <div className="flex items-center gap-2 text-primary"><BarChart3 className="h-5 w-5" /><span className="text-xs font-semibold">OPSQAI / {t.simulator}</span></div>
    <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">{t.calculate}</h2>
    <p className="mt-4 max-w-2xl text-muted-foreground">{t.simulatorIntro}</p>
    <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t.simulator}>
      {t.sectors.map((label, index) => <Button key={label} variant={sector === index ? "default" : "outline"} aria-pressed={sector === index} onClick={() => setSector(index)}>{label}</Button>)}
    </div>
    <div className="mt-8 grid gap-10 lg:grid-cols-2">
      <div className="grid content-start gap-5 sm:grid-cols-2">
        {keys.map((key, index) => <label key={key} className="block text-sm font-medium">
          {t.fields[index]}
          <input type="number" min="0" step={key === "hourlyCost" || key === "recoveredMinutes" ? "0.5" : "1"} value={inputs[key]} onChange={event => {
            const value = Number(event.target.value);
            setInputs(previous => ({ ...previous, [key]: Number.isFinite(value) ? Math.max(0, value) : 0 }));
          }} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>)}
        <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">{t.formula}</p>
      </div>
      <div className="min-w-0 border-l-2 border-primary pl-6" aria-live="polite" aria-atomic="true">
        <p className="text-sm text-muted-foreground">{t.sectors[sector]} / {t.current}</p>
        <p data-testid="search-cost" className="mt-2 break-words font-display text-3xl font-semibold sm:text-4xl">{money.format(result.searchCost)}</p>
        <p className="mt-2 text-sm text-muted-foreground">{number.format(result.searchHours)} {t.hours.toLowerCase()}</p>
        <div className="mt-6 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">{t.potential}</p>
          <p data-testid="recovered-value" className="mt-2 break-words font-display text-3xl font-semibold text-success">{money.format(result.recoveredValue)}</p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t.caution}</p>
        </div>
        <Button asChild className="mt-6 h-auto min-h-11 max-w-full whitespace-normal text-left"><Link to="/pilot">{t.pilot}<ArrowRight className="h-4 w-4 shrink-0" /></Link></Button>
      </div>
    </div>
  </SectionShell>;
}

export function ResearchArticle({ study }: { study: OperationalResearch }) {
  const { lang } = useT();
  const t = useBenchmarkCopy();
  const text = study.text[lang];
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return <>
    <div className="border-l-2 border-primary pl-6">
      <p className="font-display text-5xl font-semibold text-primary">{study.metric}</p>
      <p className="mt-4 text-lg leading-relaxed">{text.finding}</p>
      <p className="mt-4 text-sm text-muted-foreground">{study.publisher} · {study.year}. {text.population}</p>
      <a href={study.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4">{t.source}<ExternalLink className="h-4 w-4" /></a>
    </div>
    {[[t.analysisTitle, text.analysis], [t.mechanismTitle, text.mechanism], [t.limitTitle, text.limitation]].map(([title, body]) => <section key={title} className="mt-10"><h2 className="font-display text-2xl font-semibold">{title}</h2><p className="mt-4 text-base leading-relaxed text-muted-foreground">{body}</p></section>)}
    <p className="mt-8 text-xs text-muted-foreground">{t.distinction}</p>
    <div className="mt-8 flex flex-wrap gap-3">
      <Button asChild><Link to="/studies">{t.calculate}<ArrowRight className="h-4 w-4" /></Link></Button>
      <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setCopyError(false); } catch { setCopyError(true); } }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? t.copied : t.share}</Button>
    </div>
    {copyError && <p role="status" className="mt-3 text-sm text-destructive">{t.shareError}</p>}
  </>;
}