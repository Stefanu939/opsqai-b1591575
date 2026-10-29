import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { pageHead, breadcrumbLd } from "@/lib/seo";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { useT } from "@/i18n";
import {
  INDUSTRIES,
  INDUSTRY_MODELS,
  estimateIndustryLoss,
  isIndustry,
  type Industry,
} from "@/lib/industry-loss";
import { cn } from "@/lib/utils";

type Lang = "en" | "de" | "ro";

const COPY: Record<
  Lang,
  {
    eyebrow: string;
    title: string;
    accent: string;
    intro: string;
    industries: Record<Industry, { name: string; unit: string }>;
    items: Record<string, string>;
    monthly: string;
    yearly: string;
    method: string;
    caseLink: string;
    kai: string;
    pilot: string;
    solution: string;
  }
> = {
  ro: {
    eyebrow: "Calculator de pierderi operaționale",
    title: "Cât te costă lunar",
    accent: "munca manuală repetitivă?",
    intro:
      "Alege domeniul, introdu dimensiunea firmei și vezi o estimare pe baza modelelor noastre publicate. Ipotezele sunt transparente — le poți verifica în studiul de caz.",
    industries: {
      transport: { name: "Transport & Logistică", unit: "Număr de camioane" },
      "service-auto": { name: "Service Auto", unit: "Număr de posturi de lucru" },
      production: { name: "Producție", unit: "Număr de angajați" },
      banking: { name: "Bănci & Finanțe", unit: "Număr de sucursale" },
    },
    items: {
      dispatch: "Timp pierdut în dispecerat",
      cmr: "Erori CMR și facturare întârziată",
      compliance: "Termene ITP / roviniete / tahograf",
      reconciliation: "Reconciliere comenzi și documente",
      calls: "Telefoane repetitive de la clienți",
      quotes: "Devize întârziate sau greșite",
      specs: "Căutare specificații și piese",
      history: "Istoric reparații și garanții",
      training: "Instruire operatori și fluctuație",
      handover: "Predare tură incompletă",
      search: "Căutare proceduri",
      scrap: "Rebut din versiuni greșite",
      audit: "Pregătire audit și dovezi",
      versions: "Proceduri depășite",
    },
    monthly: "Estimare lunară",
    yearly: "Estimare anuală",
    method:
      "Model liniar pornind de la studiul de caz publicat. Nu este rezultatul unui client și nu reprezintă o economie garantată.",
    caseLink: "Vezi ipotezele în studiul de caz",
    kai: "Discută cifrele cu KAI",
    pilot: "Pornește pilotul gratuit de 30 de zile",
    solution: "Vezi soluția pentru domeniu",
  },
  en: {
    eyebrow: "Operational loss calculator",
    title: "What does repetitive manual work",
    accent: "cost you every month?",
    intro:
      "Pick your industry, enter your size and see an estimate based on our published models. The assumptions are transparent — check them in the business case.",
    industries: {
      transport: { name: "Transport & Logistics", unit: "Number of trucks" },
      "service-auto": { name: "Car Service", unit: "Number of service bays" },
      production: { name: "Manufacturing", unit: "Number of employees" },
      banking: { name: "Banking & Finance", unit: "Number of branches" },
    },
    items: {
      dispatch: "Dispatch time lost",
      cmr: "CMR errors and late invoicing",
      compliance: "Inspection / toll / tachograph deadlines",
      reconciliation: "Order and document reconciliation",
      calls: "Repetitive customer calls",
      quotes: "Late or wrong quotes",
      specs: "Searching specs and parts",
      history: "Repair and warranty history",
      training: "Operator training and turnover",
      handover: "Incomplete shift handover",
      search: "Searching procedures",
      scrap: "Scrap from wrong versions",
      audit: "Audit preparation and evidence",
      versions: "Outdated procedures",
    },
    monthly: "Monthly estimate",
    yearly: "Yearly estimate",
    method:
      "Linear model based on the published business case. Not a customer result and not a guaranteed saving.",
    caseLink: "See the assumptions in the business case",
    kai: "Discuss the numbers with KAI",
    pilot: "Start the free 30-day pilot",
    solution: "See the industry solution",
  },
  de: {
    eyebrow: "Rechner für operative Verluste",
    title: "Was kostet Sie repetitive Handarbeit",
    accent: "jeden Monat?",
    intro:
      "Branche wählen, Größe eingeben und eine Schätzung auf Basis unserer veröffentlichten Modelle sehen. Die Annahmen sind transparent — prüfen Sie sie im Business Case.",
    industries: {
      transport: { name: "Transport & Logistik", unit: "Anzahl Lkw" },
      "service-auto": { name: "Kfz-Werkstatt", unit: "Anzahl Arbeitsplätze" },
      production: { name: "Produktion", unit: "Anzahl Mitarbeitende" },
      banking: { name: "Banken & Finanzen", unit: "Anzahl Filialen" },
    },
    items: {
      dispatch: "Verlorene Disponentenzeit",
      cmr: "CMR-Fehler und späte Rechnungen",
      compliance: "Fristen HU / Maut / Tachograph",
      reconciliation: "Abgleich Aufträge und Dokumente",
      calls: "Wiederholte Kundenanrufe",
      quotes: "Verspätete oder falsche Kostenvoranschläge",
      specs: "Suche nach Spezifikationen und Teilen",
      history: "Reparatur- und Garantiehistorie",
      training: "Einarbeitung und Fluktuation",
      handover: "Unvollständige Schichtübergabe",
      search: "Suche nach Verfahren",
      scrap: "Ausschuss durch falsche Versionen",
      audit: "Auditvorbereitung und Nachweise",
      versions: "Veraltete Verfahren",
    },
    monthly: "Monatliche Schätzung",
    yearly: "Jährliche Schätzung",
    method:
      "Lineares Modell auf Basis des veröffentlichten Business Case. Kein Kundenergebnis und keine garantierte Einsparung.",
    caseLink: "Annahmen im Business Case ansehen",
    kai: "Zahlen mit KAI besprechen",
    pilot: "Kostenlosen 30-Tage-Pilot starten",
    solution: "Branchenlösung ansehen",
  },
};

const SOLUTION_FOR: Record<Industry, string> = {
  transport: "transport",
  "service-auto": "service-auto",
  production: "production",
  banking: "banking",
};

export const Route = createFileRoute("/calculator")({
  validateSearch: (s: Record<string, unknown>): { industry?: Industry } =>
    isIndustry(s.industry) ? { industry: s.industry } : {},
  head: () =>
    pageHead({
      title: "Calculator pierderi operaționale — Transport, Service Auto, Producție | OPSQAI",
      description:
        "Calculează cât pierde lunar firma ta din muncă manuală repetitivă: camioane, posturi de service, angajați sau sucursale. Ipoteze transparente, model gratuit.",
      path: "/calculator",
      keywords:
        "calculator costuri operationale, calculator ROI transport, pierderi service auto, costuri productie, digitalizare firma Romania",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Calculator", path: "/calculator" },
      ],
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Calculator", path: "/calculator" },
        ]),
      ],
    }),
  component: CalculatorPage,
});

const DEFAULT_UNITS: Record<Industry, number> = Object.fromEntries(
  INDUSTRIES.map((i) => [i, INDUSTRY_MODELS[i].referenceUnits]),
) as Record<Industry, number>;

function CalculatorPage() {
  const search = Route.useSearch();
  const { lang } = useT();
  const t = COPY[(lang as Lang) in COPY ? (lang as Lang) : "en"];
  const [industry, setIndustry] = useState<Industry>(search.industry ?? "transport");
  const [units, setUnits] = useState<Record<Industry, number>>(DEFAULT_UNITS);
  const result = estimateIndustryLoss(industry, units[industry]);
  const money = useMemo(
    () =>
      new Intl.NumberFormat(lang === "de" ? "de-DE" : lang === "ro" ? "ro-RO" : "en-IE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }),
    [lang],
  );
  const model = INDUSTRY_MODELS[industry];

  return (
    <OixLayout>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-32 md:px-10 md:pt-40">
          <EditorialHeadline as="h1" size="xl" eyebrow={t.eyebrow} serifAccent={t.accent}>
            {t.title}
          </EditorialHeadline>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t.intro}</p>
        </div>
      </section>

      <SectionShell>
        <div className="flex flex-wrap gap-2" role="tablist">
          {INDUSTRIES.map((i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={industry === i}
              onClick={() => setIndustry(i)}
              className={cn(
                "min-h-11 rounded-md border px-4 text-sm font-medium transition-colors",
                industry === i
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/60",
              )}
            >
              {t.industries[i].name}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-xl border border-border bg-card p-6 md:p-8">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.industries[industry].unit}
              </span>
              <input
                type="number"
                min={0}
                value={units[industry]}
                onChange={(e) =>
                  setUnits((u) => ({ ...u, [industry]: Math.max(0, Number(e.target.value) || 0) }))
                }
                className="mt-2 h-12 w-full rounded-md border border-border bg-background px-3 text-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            <input
              type="range"
              aria-label={t.industries[industry].unit}
              min={1}
              max={model.referenceUnits * 5}
              value={Math.min(units[industry], model.referenceUnits * 5)}
              onChange={(e) => setUnits((u) => ({ ...u, [industry]: Number(e.target.value) }))}
              className="mt-6 w-full accent-[var(--primary)]"
            />
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{t.method}</p>
            <Link
              to="/blog/$slug"
              params={{ slug: model.caseSlug }}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              {t.caseLink}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-6 md:p-8">
            <dl className="grid gap-4">
              {result.items.map((i) => (
                <div
                  key={i.key}
                  className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-3"
                >
                  <dt className="text-sm text-muted-foreground">{t.items[i.key]}</dt>
                  <dd className="font-display text-lg font-semibold text-foreground">
                    {money.format(i.monthly)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {t.monthly}
                </div>
                <div className="mt-2 font-display text-4xl font-semibold text-foreground">
                  {money.format(result.monthly)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {t.yearly}
                </div>
                <div className="mt-2 font-display text-4xl font-semibold text-foreground">
                  {money.format(result.yearly)}
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <OixButton to="/kai" variant="gold" withArrow>
                {t.kai}
              </OixButton>
              <OixButton to="/pilot" variant="ghost">
                {t.pilot}
              </OixButton>
            </div>
            <Link
              to="/solutions/$vertical"
              params={{ vertical: SOLUTION_FOR[industry] }}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              {t.solution}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
