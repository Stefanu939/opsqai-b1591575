/**
 * OPSQAI Value Engine — pure operational value calculations.
 *
 * No I/O. The same functions run in the Management Center UI and in the PDF
 * report generator, so the numbers a colleague sees are exactly the numbers a
 * prospect reads. Every figure derives from inputs the colleague typed in;
 * nothing here invents data or promises a saving.
 *
 * Model: Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort)
 */

export const VALUE_DRIVERS = [
  "search",
  "training",
  "errors",
  "downtime",
  "escalations",
  "onboarding",
  "deviations",
  "knowledge_loss",
  "management",
] as const;

export type ValueDriverKey = (typeof VALUE_DRIVERS)[number];

export type EffortLevel = "low" | "medium" | "high";

export type QuickInputs = {
  /** Employees affected by the information problem. */
  employees: number;
  /** Fully loaded average cost per hour, in the model currency. */
  hourlyCost: number;
  /** Minutes lost per employee per day searching for information. */
  minutesPerDay: number;
  /** Working days per year. */
  workingDays: number;
  /** Estimated reduction of the lost time, in percent. */
  improvementPct: number;
};

export type DriverInput = {
  key: ValueDriverKey;
  /** Current annual cost of this driver, as stated by the customer. */
  currentCost: number;
  /** Estimated reduction OPSQAI could contribute, in percent. */
  impactPct: number;
};

export type ValueInputs = {
  level: 1 | 2 | 3;
  currency: string;
  quick: QuickInputs;
  /** Additional value drivers (levels 2 and 3). `search` is always derived. */
  drivers: DriverInput[];
  /** Annual OPSQAI investment. */
  investment: number;
  /** Perceived likelihood of achieving the outcome, in percent (level 3). */
  likelihoodPct: number;
  /** Months until the value starts to materialise (level 3). */
  timeToValueMonths: number;
  /** Implementation effort / sacrifice for the customer (level 3). */
  effort: EffortLevel;
};

export type DriverRow = DriverInput & { value: number };

export type ValueScoreLabel = "low" | "moderate" | "high" | "very-high";

export type ValueResult = {
  currency: string;
  /** Annual cost of information search, derived from the quick inputs. */
  searchLoss: number;
  drivers: DriverRow[];
  /** Sum of all current annual costs entered. */
  currentTotal: number;
  /** Sum of driver values before applying likelihood. */
  potentialValue: number;
  /** Potential value x likelihood (level 3), otherwise the potential value. */
  expectedValue: number;
  investment: number;
  netValue: number;
  /** (expected - investment) / investment, in percent. */
  roiPct: number;
  /** expected / investment. */
  valueMultiple: number;
  /** potential / current total, in percent. */
  operationalImprovementPct: number;
  /** Months of investment covered by the expected monthly value. */
  paybackMonths: number | null;
  likelihoodPct: number;
  timeToValueMonths: number;
  effort: EffortLevel;
  score: { label: ValueScoreLabel; ratio: number };
  /** Drivers with value, largest first. */
  topDrivers: DriverRow[];
};

const EFFORT_FACTOR: Record<EffortLevel, number> = { low: 1, medium: 1.5, high: 2.25 };

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const safe = (n: number) => (Number.isFinite(n) ? n : 0);

export function defaultQuickInputs(): QuickInputs {
  return { employees: 100, hourlyCost: 30, minutesPerDay: 15, workingDays: 220, improvementPct: 40 };
}

export function defaultValueInputs(): ValueInputs {
  return {
    level: 1,
    currency: "EUR",
    quick: defaultQuickInputs(),
    drivers: [],
    investment: 20000,
    likelihoodPct: 80,
    timeToValueMonths: 2,
    effort: "low",
  };
}

/** Annual cost of employees not finding the right information fast enough. */
export function searchLoss(q: QuickInputs): number {
  return round2(
    safe(Math.max(0, q.employees)) *
      (safe(Math.max(0, q.minutesPerDay)) / 60) *
      safe(Math.max(0, q.hourlyCost)) *
      safe(Math.max(0, q.workingDays)),
  );
}

export function computeValue(input: ValueInputs): ValueResult {
  const loss = searchLoss(input.quick);
  const improvement = clamp(safe(input.quick.improvementPct), 0, 100);

  const extra: DriverInput[] =
    input.level === 1 ? [] : input.drivers.filter((d) => d.key !== "search");

  const rows: DriverRow[] = [
    {
      key: "search" as ValueDriverKey,
      currentCost: loss,
      impactPct: improvement,
      value: round2((loss * improvement) / 100),
    },
    ...extra.map((d) => {
      const cost = Math.max(0, safe(d.currentCost));
      const impact = clamp(safe(d.impactPct), 0, 100);
      return { key: d.key, currentCost: cost, impactPct: impact, value: round2((cost * impact) / 100) };
    }),
  ];

  const currentTotal = round2(rows.reduce((s, r) => s + r.currentCost, 0));
  const potentialValue = round2(rows.reduce((s, r) => s + r.value, 0));

  const likelihood = input.level === 3 ? clamp(safe(input.likelihoodPct), 0, 100) : 100;
  const expectedValue = round2((potentialValue * likelihood) / 100);

  const investment = Math.max(0, safe(input.investment));
  const netValue = round2(expectedValue - investment);
  const roiPct = investment > 0 ? round2(((expectedValue - investment) / investment) * 100) : 0;
  const valueMultiple = investment > 0 ? round2(expectedValue / investment) : 0;
  const operationalImprovementPct =
    currentTotal > 0 ? round2((potentialValue / currentTotal) * 100) : 0;
  const paybackMonths =
    expectedValue > 0 && investment > 0 ? round2(investment / (expectedValue / 12)) : null;

  const months = Math.max(0.5, safe(input.timeToValueMonths) || 1);
  const effort = input.effort ?? "low";
  const ratio =
    investment > 0
      ? round2(expectedValue / (investment * (months / 12 + 1) * EFFORT_FACTOR[effort]))
      : 0;
  const label: ValueScoreLabel =
    ratio >= 4 ? "very-high" : ratio >= 2 ? "high" : ratio >= 1 ? "moderate" : "low";

  return {
    currency: input.currency || "EUR",
    searchLoss: loss,
    drivers: rows,
    currentTotal,
    potentialValue,
    expectedValue,
    investment,
    netValue,
    roiPct,
    valueMultiple,
    operationalImprovementPct,
    paybackMonths,
    likelihoodPct: likelihood,
    timeToValueMonths: months,
    effort,
    score: { label, ratio },
    topDrivers: [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value),
  };
}

/** Pessimistic / base / optimistic view of the same profile. */
export function scenarios(input: ValueInputs): Array<{ label: string; impactPct: number; result: ValueResult }> {
  const base = clamp(safe(input.quick.improvementPct), 0, 100);
  const variants = [
    { label: "pessimistic", impactPct: Math.max(0, round2(base / 2)) },
    { label: "base", impactPct: base },
    { label: "optimistic", impactPct: Math.min(100, round2(base * 1.5)) },
  ];
  return variants.map((v) => {
    const factor = base > 0 ? v.impactPct / base : 1;
    return {
      label: v.label,
      impactPct: v.impactPct,
      result: computeValue({
        ...input,
        quick: { ...input.quick, improvementPct: v.impactPct },
        drivers: input.drivers.map((d) => ({
          ...d,
          impactPct: clamp(round2(d.impactPct * factor), 0, 100),
        })),
      }),
    };
  });
}

export function formatMoney(amount: number, currency: string, locale = "en-IE"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(safe(amount));
}
