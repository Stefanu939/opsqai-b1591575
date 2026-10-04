// OPSQAI commercial pricing — single source for the price calculator, the
// offer PDF and the onboarding wizard. Values are minimums the colleague can
// raise per customer; nothing here is a promise of savings.

export const PRICING = {
  setupOneTime: 12_000,
  maintenanceMonthlyMin: 500,
  workspaceMonthlyMin: 400,
  currency: "EUR",
} as const;

export const WORKSPACES = [
  { key: "opsqai_transport", label: "Transport & Logistică" },
  { key: "opsqai_hr", label: "HR" },
] as const;

export type QuoteInput = {
  workstations: number;
  maintenanceMonthly: number;
  workspaces: Array<{ key: string; label: string; monthly: number }>;
  employees: number;
  setupOneTime?: number;
};

export type Quote = {
  computers: number;
  setup: number;
  monthly: number;
  annual: number;
  firstYear: number;
  perEmployeePerDay: number;
  currency: string;
};

const WORK_DAYS = 220;

export function computeQuote(q: QuoteInput): Quote {
  const maintenance = Math.max(PRICING.maintenanceMonthlyMin, q.maintenanceMonthly || 0);
  const ws = q.workspaces.reduce(
    (s, w) => s + Math.max(PRICING.workspaceMonthlyMin, w.monthly || 0),
    0,
  );
  const setup = q.setupOneTime ?? PRICING.setupOneTime;
  const monthly = maintenance + ws;
  const annual = monthly * 12;
  const employees = Math.max(1, q.employees || 1);
  return {
    computers: 1 + Math.max(0, q.workstations),
    setup,
    monthly,
    annual,
    firstYear: setup + annual,
    perEmployeePerDay: annual / (employees * WORK_DAYS),
    currency: PRICING.currency,
  };
}

export function eur(n: number, digits = 0) {
  return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)} €`;
}

/** Simple, editable ROI estimate: time saved on searching + faster onboarding. */
export function estimateSavings(i: {
  employees: number;
  hourlyCost: number;
  minutesSavedPerDay: number;
  newHiresPerYear: number;
  trainingDaysSavedPerHire: number;
}) {
  const search = i.employees * (i.minutesSavedPerDay / 60) * i.hourlyCost * WORK_DAYS;
  const onboarding = i.newHiresPerYear * i.trainingDaysSavedPerHire * 8 * i.hourlyCost;
  return { search, onboarding, total: search + onboarding };
}
