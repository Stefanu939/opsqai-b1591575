// Server-only: OPSQAI Value Report (A4 PDF) built from a value model.
//
// Every number is derived from the inputs the colleague entered. The wording is
// deliberately estimative — the report never guarantees a saving.

import { generatePdf, type PdfBlock } from "@/lib/generators/pdf.server";
import {
  computeValue,
  formatMoney,
  scenarios,
  type ValueDriverKey,
  type ValueInputs,
} from "@/lib/value-engine";

type Lang = "en" | "de" | "ro";

const LOCALE: Record<Lang, string> = { en: "en-IE", de: "de-DE", ro: "ro-RO" };

const DRIVER_LABELS: Record<Lang, Record<ValueDriverKey, string>> = {
  en: {
    search: "Information search",
    training: "Training & retraining",
    errors: "Errors & rework",
    downtime: "Downtime",
    escalations: "Escalations",
    onboarding: "Onboarding",
    deviations: "Process deviations",
    knowledge_loss: "Knowledge loss",
    management: "Management intervention",
  },
  de: {
    search: "Informationssuche",
    training: "Schulung & Nachschulung",
    errors: "Fehler & Nacharbeit",
    downtime: "Stillstandszeit",
    escalations: "Eskalationen",
    onboarding: "Einarbeitung",
    deviations: "Prozessabweichungen",
    knowledge_loss: "Wissensverlust",
    management: "Eingriffe der Fuehrung",
  },
  ro: {
    search: "Cautarea informatiei",
    training: "Instruire si reinstruire",
    errors: "Erori si refacere",
    downtime: "Timp de nefunctionare",
    escalations: "Escaladari",
    onboarding: "Integrare angajati noi",
    deviations: "Abateri de proces",
    knowledge_loss: "Pierdere de cunostinte",
    management: "Intervenția conducerii".replace("ț", "t"),
  },
};

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    title: "OPSQAI Operational Value Report",
    subtitle: "Estimated operational value based on the information you provided",
    profile: "Operational profile",
    drivers: "Value drivers",
    results: "Estimated value",
    scenarios: "What if the impact is different?",
    proposition: "Value proposition",
    assumptions: "Assumptions & notes",
    disclaimer:
      "This report is an estimate produced from the figures provided during the conversation. It is not a guarantee of savings or of a specific result.",
    currentLoss: "Current annual loss",
    potential: "Potential annual value",
    expected: "Expected annual value",
    investment: "Annual investment",
    net: "Net annual value",
    roi: "ROI",
    multiple: "Value multiple",
    improvement: "Operational improvement",
    payback: "Payback",
    likelihood: "Likelihood of achievement",
    ttv: "Time to value",
    effort: "Implementation effort",
    driver: "Value driver",
    current: "Current annual cost",
    impact: "Estimated impact",
    value: "Estimated value",
    scenario: "Scenario",
    months: "months",
    employees: "Employees affected",
    hourly: "Average cost per hour",
    minutes: "Minutes lost per day",
    days: "Working days per year",
    score: "OPSQAI value score",
    top: "Largest value drivers",
  },
  de: {
    title: "OPSQAI Bericht zum operativen Wert",
    subtitle: "Geschaetzter operativer Wert auf Basis Ihrer Angaben",
    profile: "Operatives Profil",
    drivers: "Werttreiber",
    results: "Geschaetzter Wert",
    scenarios: "Was, wenn die Wirkung anders ausfaellt?",
    proposition: "Wertversprechen",
    assumptions: "Annahmen & Hinweise",
    disclaimer:
      "Dieser Bericht ist eine Schaetzung auf Basis der im Gespraech genannten Zahlen. Er ist keine Garantie fuer Einsparungen oder ein bestimmtes Ergebnis.",
    currentLoss: "Aktueller Jahresverlust",
    potential: "Potenzieller Jahreswert",
    expected: "Erwarteter Jahreswert",
    investment: "Jaehrliche Investition",
    net: "Netto-Jahreswert",
    roi: "ROI",
    multiple: "Wertfaktor",
    improvement: "Operative Verbesserung",
    payback: "Amortisation",
    likelihood: "Erreichungswahrscheinlichkeit",
    ttv: "Zeit bis zum Nutzen",
    effort: "Umsetzungsaufwand",
    driver: "Werttreiber",
    current: "Aktuelle Jahreskosten",
    impact: "Geschaetzte Wirkung",
    value: "Geschaetzter Wert",
    scenario: "Szenario",
    months: "Monate",
    employees: "Betroffene Mitarbeitende",
    hourly: "Durchschnittskosten pro Stunde",
    minutes: "Verlorene Minuten pro Tag",
    days: "Arbeitstage pro Jahr",
    score: "OPSQAI Wert-Score",
    top: "Groesste Werttreiber",
  },
  ro: {
    title: "Raport OPSQAI de valoare operationala",
    subtitle: "Valoare operationala estimata pe baza informatiilor furnizate",
    profile: "Profil operational",
    drivers: "Factori de valoare",
    results: "Valoare estimata",
    scenarios: "Ce se intampla daca impactul este diferit?",
    proposition: "Propunere de valoare",
    assumptions: "Ipoteze si observatii",
    disclaimer:
      "Acest raport este o estimare realizata pe baza cifrelor furnizate in discutie. Nu este o garantie de economii sau de un rezultat anume.",
    currentLoss: "Pierdere anuala actuala",
    potential: "Valoare anuala potentiala",
    expected: "Valoare anuala asteptata",
    investment: "Investitie anuala",
    net: "Valoare anuala neta",
    roi: "ROI",
    multiple: "Multiplu de valoare",
    improvement: "Imbunatatire operationala",
    payback: "Recuperare investitie",
    likelihood: "Probabilitate de atingere",
    ttv: "Timp pana la rezultat",
    effort: "Efort de implementare",
    driver: "Factor de valoare",
    current: "Cost anual actual",
    impact: "Impact estimat",
    value: "Valoare estimata",
    scenario: "Scenariu",
    months: "luni",
    employees: "Angajati afectati",
    hourly: "Cost mediu pe ora",
    minutes: "Minute pierdute pe zi",
    days: "Zile lucratoare pe an",
    score: "Scor de valoare OPSQAI",
    top: "Cei mai mari factori de valoare",
  },
};

const SCORE_LABEL: Record<Lang, Record<string, string>> = {
  en: { low: "Low", moderate: "Moderate", high: "High", "very-high": "Very high" },
  de: { low: "Niedrig", moderate: "Mittel", high: "Hoch", "very-high": "Sehr hoch" },
  ro: { low: "Scazut", moderate: "Moderat", high: "Ridicat", "very-high": "Foarte ridicat" },
};

const EFFORT_LABEL: Record<Lang, Record<string, string>> = {
  en: { low: "Low", medium: "Medium", high: "High" },
  de: { low: "Niedrig", medium: "Mittel", high: "Hoch" },
  ro: { low: "Scazut", medium: "Mediu", high: "Ridicat" },
};

const SCENARIO_LABEL: Record<Lang, Record<string, string>> = {
  en: { pessimistic: "Conservative", base: "Base", optimistic: "Ambitious" },
  de: { pessimistic: "Konservativ", base: "Basis", optimistic: "Ambitioniert" },
  ro: { pessimistic: "Conservator", base: "De baza", optimistic: "Ambitios" },
};

export async function buildValueReport(args: {
  companyName: string;
  assumptions: string | null;
  lang: Lang;
  inputs: ValueInputs;
}): Promise<Uint8Array> {
  const { lang, inputs } = args;
  const c = COPY[lang];
  const dl = DRIVER_LABELS[lang];
  const locale = LOCALE[lang];
  const r = computeValue(inputs);
  const money = (n: number) => formatMoney(n, r.currency, locale);
  const pct = (n: number) => `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n)}%`;

  const blocks: PdfBlock[] = [
    {
      type: "kpis",
      items: [
        { label: c.currentLoss ?? "", value: money(r.currentTotal) },
        { label: c.potential ?? "", value: money(r.potentialValue) },
        { label: c.expected ?? "", value: money(r.expectedValue) },
        { label: c.multiple ?? "", value: `${r.valueMultiple.toFixed(2)}x` },
      ],
    },
    { type: "h2", text: c.profile ?? "" },
    {
      type: "table",
      headers: [c.driver ?? "", c.value ?? ""],
      rows: [
        [c.employees ?? "", String(inputs.quick.employees)],
        [c.hourly ?? "", money(inputs.quick.hourlyCost)],
        [c.minutes ?? "", String(inputs.quick.minutesPerDay)],
        [c.days ?? "", String(inputs.quick.workingDays)],
        [c.investment ?? "", money(r.investment)],
      ],
    },
    { type: "h2", text: c.drivers ?? "" },
    {
      type: "table",
      headers: [c.driver ?? "", c.current ?? "", c.impact ?? "", c.value ?? ""],
      rows: r.drivers.map((d) => [
        dl[d.key],
        money(d.currentCost),
        pct(d.impactPct),
        money(d.value),
      ]),
    },
    { type: "h2", text: c.results ?? "" },
    {
      type: "table",
      headers: [c.driver ?? "", c.value ?? ""],
      rows: [
        [c.potential ?? "", money(r.potentialValue)],
        [c.likelihood ?? "", pct(r.likelihoodPct)],
        [c.expected ?? "", money(r.expectedValue)],
        [c.investment ?? "", money(r.investment)],
        [c.net ?? "", money(r.netValue)],
        [c.roi ?? "", pct(r.roiPct)],
        [c.multiple ?? "", `${r.valueMultiple.toFixed(2)}x`],
        [c.improvement ?? "", pct(r.operationalImprovementPct)],
        [
          c.payback ?? "",
          r.paybackMonths == null ? "-" : `${r.paybackMonths.toFixed(1)} ${c.months}`,
        ],
        [c.ttv ?? "", `${r.timeToValueMonths} ${c.months}`],
        [c.effort ?? "", EFFORT_LABEL[lang][r.effort] ?? r.effort],
        [c.score ?? "", SCORE_LABEL[lang][r.score.label] ?? r.score.label],
      ],
    },
    { type: "h2", text: c.scenarios ?? "" },
    {
      type: "table",
      headers: [c.scenario ?? "", c.impact ?? "", c.potential ?? "", c.expected ?? ""],
      rows: scenarios(inputs).map((s) => [
        SCENARIO_LABEL[lang][s.label] ?? s.label,
        pct(s.impactPct),
        money(s.result.potentialValue),
        money(s.result.expectedValue),
      ]),
    },
    { type: "h2", text: c.proposition ?? "" },
    { type: "p", text: proposition(lang, args.companyName, r, money, dl) },
    ...(r.topDrivers.length
      ? ([
          {
            type: "bullets",
            items: r.topDrivers
              .slice(0, 3)
              .map((d) => `${dl[d.key]} - ${money(d.value)}`),
          },
        ] as PdfBlock[])
      : []),
    ...(args.assumptions
      ? ([
          { type: "h2", text: c.assumptions ?? "" },
          { type: "p", text: args.assumptions },
        ] as PdfBlock[])
      : []),
    { type: "callout", kind: "note", text: c.disclaimer ?? "" },
  ];

  return generatePdf({
    title: c.title ?? "OPSQAI Value Report",
    subtitle: `${args.companyName} - ${c.subtitle}`,
    author: "OPSQAI",
    blocks,
    meta: {
      customerName: args.companyName,
      documentType: c.title,
      date: new Date().toISOString().slice(0, 10),
      brand: "OPSQAI",
      confidentiality: "Commercial in confidence",
    },
  });
}

function proposition(
  lang: Lang,
  company: string,
  r: ReturnType<typeof computeValue>,
  money: (n: number) => string,
  dl: Record<ValueDriverKey, string>,
): string {
  const top = r.topDrivers[0];
  const topText = top ? `${dl[top.key]} (${money(top.value)})` : "-";
  if (lang === "de") {
    return `Auf Basis des von ${company} beschriebenen operativen Profils koennte OPSQAI schaetzungsweise ${money(
      r.expectedValue,
    )} operativen Wert pro Jahr zurueckgewinnen. Der groesste Werttreiber ist ${topText}. Bei einer Investition von ${money(
      r.investment,
    )} pro Jahr ergibt das einen geschaetzten Wertfaktor von ${r.valueMultiple.toFixed(2)}x.`;
  }
  if (lang === "ro") {
    return `Pe baza profilului operational descris de ${company}, OPSQAI ar putea recupera estimativ ${money(
      r.expectedValue,
    )} valoare operationala pe an. Cel mai mare factor de valoare este ${topText}. La o investitie de ${money(
      r.investment,
    )} pe an, rezulta un multiplu estimat de ${r.valueMultiple.toFixed(2)}x.`;
  }
  return `Based on the operational profile described by ${company}, OPSQAI could help recover an estimated ${money(
    r.expectedValue,
  )} of operational value per year. The largest value driver is ${topText}. With an investment of ${money(
    r.investment,
  )} per year, this represents an estimated value multiple of ${r.valueMultiple.toFixed(2)}x.`;
}
