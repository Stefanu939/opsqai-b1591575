// Pure, browser-safe operational-loss model for the public /calculator page.
// Each industry scales the published OPSQAI business-case assumptions linearly
// from its reference size. It is an estimate the visitor recalculates, never a
// measured OPSQAI result.

export const INDUSTRIES = ["transport", "service-auto", "production", "banking"] as const;
export type Industry = (typeof INDUSTRIES)[number];

export function isIndustry(value: unknown): value is Industry {
  return typeof value === "string" && (INDUSTRIES as readonly string[]).includes(value);
}

export interface IndustryModel {
  /** Reference size the business case was built for (trucks, bays, employees, branches). */
  referenceUnits: number;
  /** Monthly € line items at the reference size. */
  items: { key: string; monthly: number }[];
  /** Slug of the matching business-case article. */
  caseSlug: string;
}

export const INDUSTRY_MODELS: Record<Industry, IndustryModel> = {
  transport: {
    referenceUnits: 40,
    caseSlug: "business-case-transport-40-camioane",
    items: [
      { key: "dispatch", monthly: 1200 },
      { key: "cmr", monthly: 1500 },
      { key: "compliance", monthly: 800 },
      { key: "reconciliation", monthly: 1500 },
    ],
  },
  "service-auto": {
    referenceUnits: 12,
    caseSlug: "business-case-service-auto-12-puncte",
    items: [
      { key: "calls", monthly: 700 },
      { key: "quotes", monthly: 900 },
      { key: "specs", monthly: 800 },
      { key: "history", monthly: 600 },
    ],
  },
  production: {
    referenceUnits: 150,
    caseSlug: "business-case-productie-150-angajati",
    items: [
      { key: "training", monthly: 2200 },
      { key: "handover", monthly: 1400 },
      { key: "search", monthly: 1300 },
      { key: "scrap", monthly: 1600 },
    ],
  },
  banking: {
    referenceUnits: 10,
    caseSlug: "business-case-banking-dora",
    items: [
      { key: "search", monthly: 3500 },
      { key: "audit", monthly: 2000 },
      { key: "training", monthly: 1500 },
      { key: "versions", monthly: 1000 },
    ],
  },
};

export interface LossEstimate {
  items: { key: string; monthly: number }[];
  monthly: number;
  yearly: number;
}

/** Scales the industry model to `units`; negative/invalid input counts as 0. */
export function estimateIndustryLoss(industry: Industry, units: number): LossEstimate {
  const model = INDUSTRY_MODELS[industry];
  const safe = Number.isFinite(units) && units > 0 ? units : 0;
  const factor = safe / model.referenceUnits;
  const items = model.items.map((i) => ({ key: i.key, monthly: Math.round(i.monthly * factor) }));
  const monthly = items.reduce((s, i) => s + i.monthly, 0);
  return { items, monthly, yearly: monthly * 12 };
}
