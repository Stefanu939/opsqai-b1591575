// OPSQAI HR — gross → net estimate.
//
// Pure, dependency-free and deterministic so it can be unit tested and run
// both in the browser (live preview inside the employee file) and on the
// server (payslip PDF). Country packs cover Germany and Romania with the
// statutory rates as configurable inputs; every other country uses the
// generic pack where the rates are entered by HR.
//
// This is an ESTIMATE for planning and payslip transparency. It is not a
// statutory payroll run: the values HR enters stay the source of truth and
// every output carries that note.

export type NetCountry = "de" | "ro" | "generic";

export type NetLineKind = "contribution" | "tax" | "info";

export interface NetLine {
  /** Stable code, translated in the UI. */
  code: string;
  kind: NetLineKind;
  /** Rate applied, when the line is a percentage of a base. */
  rate?: number;
  amount: number;
}

export interface NetResult {
  country: NetCountry;
  gross: number;
  lines: NetLine[];
  contributions: number;
  taxes: number;
  totalDeductions: number;
  net: number;
  employerLines: NetLine[];
  employerCost: number;
}

/** Everything a country pack may need. Unset values fall back to defaults. */
export interface NetOptions {
  country?: NetCountry;
  // Germany
  taxClass?: 1 | 2 | 3 | 4 | 5 | 6;
  churchTaxRate?: number; // 0, 8 or 9 (%)
  healthExtraRate?: number; // Zusatzbeitrag, % (full rate, split in half)
  childless?: boolean; // care insurance surcharge
  children?: number;
  // Romania
  personalDeduction?: number; // absolute monthly amount
  itExempt?: boolean; // income tax exemption
  // Generic / overrides
  contributionRate?: number; // % of gross
  taxRate?: number; // % of the taxable base
  extraFixedDeduction?: number; // absolute amount
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const pct = (base: number, rate: number) => r2((base * rate) / 100);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** German income tax, §32a EStG formula (annual taxable income → annual tax). */
export function germanIncomeTaxYear(taxable: number): number {
  const x = Math.floor(Math.max(0, taxable));
  if (x <= 12_096) return 0;
  if (x <= 17_443) {
    const y = (x - 12_096) / 10_000;
    return Math.floor((932.3 * y + 1_400) * y);
  }
  if (x <= 68_480) {
    const z = (x - 17_443) / 10_000;
    return Math.floor((176.64 * z + 2_397) * z + 1_015.13);
  }
  if (x <= 277_825) return Math.floor(0.42 * x - 10_911.92);
  return Math.floor(0.45 * x - 19_246.67);
}

/** Tax-class factor applied to the taxable base (splitting / second job). */
function classFactor(taxClass: number): number {
  switch (taxClass) {
    case 3:
      return 0.5; // splitting: roughly half the base is taxed at the joint rate
    case 5:
    case 6:
      return 1.35;
    case 2:
      return 0.93;
    default:
      return 1;
  }
}

function germany(gross: number, o: NetOptions): NetResult {
  const healthExtra = clamp(o.healthExtraRate ?? 1.7, 0, 6);
  const capPension = 8_050; // monthly ceiling, pension / unemployment
  const capHealth = 5_512.5; // monthly ceiling, health / care
  const basePension = Math.min(gross, capPension);
  const baseHealth = Math.min(gross, capHealth);

  const pension = { code: "de.pension", kind: "contribution" as const, rate: 9.3, amount: pct(basePension, 9.3) };
  const unemployment = { code: "de.unemployment", kind: "contribution" as const, rate: 1.3, amount: pct(basePension, 1.3) };
  const healthRate = r2(7.3 + healthExtra / 2);
  const health = { code: "de.health", kind: "contribution" as const, rate: healthRate, amount: pct(baseHealth, healthRate) };
  const careRate = r2(1.8 + (o.childless ? 0.6 : 0) - Math.min(4, Math.max(0, (o.children ?? 0) - 1)) * 0.25);
  const care = { code: "de.care", kind: "contribution" as const, rate: careRate, amount: pct(baseHealth, careRate) };

  const contributionLines = [pension, unemployment, health, care];
  const contributions = r2(contributionLines.reduce((s, l) => s + l.amount, 0));

  // Taxable base: gross minus the employee's social contributions (simplified
  // Vorsorgepauschale) and the employee lump sum.
  const employeeLumpSum = 1_230 / 12;
  const taxableMonth = Math.max(0, gross - contributions - employeeLumpSum);
  const taxClass = (o.taxClass ?? 1) as number;
  const factor = classFactor(taxClass);
  const yearTax = germanIncomeTaxYear(taxableMonth * 12 * factor) / (taxClass === 3 ? 0.5 : 1);
  const incomeTax = r2(yearTax / 12);
  const soli = incomeTax * 12 > 19_950 ? pct(incomeTax, 5.5) : 0;
  const churchRate = clamp(o.churchTaxRate ?? 0, 0, 9);
  const church = churchRate > 0 ? pct(incomeTax, churchRate) : 0;

  const taxLines: NetLine[] = [
    { code: "de.incomeTax", kind: "tax", amount: incomeTax },
    ...(soli ? [{ code: "de.soli", kind: "tax" as const, rate: 5.5, amount: soli }] : []),
    ...(church ? [{ code: "de.church", kind: "tax" as const, rate: churchRate, amount: church }] : []),
  ];
  const extra = r2(Math.max(0, o.extraFixedDeduction ?? 0));
  if (extra) taxLines.push({ code: "extra", kind: "contribution", amount: extra });

  const taxes = r2(taxLines.filter((l) => l.kind === "tax").reduce((s, l) => s + l.amount, 0));
  const totalDeductions = r2(contributions + taxes + extra);

  const employerLines: NetLine[] = [
    { code: "de.pension", kind: "contribution", rate: 9.3, amount: pct(basePension, 9.3) },
    { code: "de.unemployment", kind: "contribution", rate: 1.3, amount: pct(basePension, 1.3) },
    { code: "de.health", kind: "contribution", rate: healthRate, amount: pct(baseHealth, healthRate) },
    { code: "de.care", kind: "contribution", rate: 1.8, amount: pct(baseHealth, 1.8) },
    { code: "de.accident", kind: "contribution", rate: 1.3, amount: pct(gross, 1.3) },
  ];

  return {
    country: "de",
    gross: r2(gross),
    lines: [...contributionLines, ...taxLines],
    contributions: r2(contributions + extra),
    taxes,
    totalDeductions,
    net: r2(gross - totalDeductions),
    employerLines,
    employerCost: r2(gross + employerLines.reduce((s, l) => s + l.amount, 0)),
  };
}

function romania(gross: number, o: NetOptions): NetResult {
  const cas = { code: "ro.cas", kind: "contribution" as const, rate: 25, amount: pct(gross, 25) };
  const cass = { code: "ro.cass", kind: "contribution" as const, rate: 10, amount: pct(gross, 10) };
  const extra = r2(Math.max(0, o.extraFixedDeduction ?? 0));
  const deduction = r2(Math.max(0, o.personalDeduction ?? 0));
  const taxable = Math.max(0, gross - cas.amount - cass.amount - deduction);
  const taxRate = o.itExempt ? 0 : clamp(o.taxRate ?? 10, 0, 50);
  const tax = { code: "ro.incomeTax", kind: "tax" as const, rate: taxRate, amount: pct(taxable, taxRate) };

  const lines: NetLine[] = [cas, cass, tax];
  if (deduction) lines.push({ code: "ro.personalDeduction", kind: "info", amount: deduction });
  if (extra) lines.push({ code: "extra", kind: "contribution", amount: extra });

  const contributions = r2(cas.amount + cass.amount + extra);
  const totalDeductions = r2(contributions + tax.amount);
  const employerLines: NetLine[] = [{ code: "ro.cam", kind: "contribution", rate: 2.25, amount: pct(gross, 2.25) }];
  return {
    country: "ro",
    gross: r2(gross),
    lines,
    contributions,
    taxes: tax.amount,
    totalDeductions,
    net: r2(gross - totalDeductions),
    employerLines,
    employerCost: r2(gross + employerLines[0]!.amount),
  };
}

function generic(gross: number, o: NetOptions): NetResult {
  const contributionRate = clamp(o.contributionRate ?? 0, 0, 60);
  const taxRate = clamp(o.taxRate ?? 0, 0, 60);
  const extra = r2(Math.max(0, o.extraFixedDeduction ?? 0));
  const contribution = pct(gross, contributionRate);
  const tax = pct(Math.max(0, gross - contribution), taxRate);
  const lines: NetLine[] = [
    { code: "generic.contributions", kind: "contribution", rate: contributionRate, amount: contribution },
    { code: "generic.tax", kind: "tax", rate: taxRate, amount: tax },
  ];
  if (extra) lines.push({ code: "extra", kind: "contribution", amount: extra });
  const totalDeductions = r2(contribution + tax + extra);
  return {
    country: "generic",
    gross: r2(gross),
    lines,
    contributions: r2(contribution + extra),
    taxes: tax,
    totalDeductions,
    net: r2(gross - totalDeductions),
    employerLines: [],
    employerCost: r2(gross),
  };
}

/** Estimate the net pay for one month of gross pay. */
export function estimateNet(gross: number, options: NetOptions = {}): NetResult {
  const g = Math.max(0, Number.isFinite(gross) ? gross : 0);
  const country = options.country ?? "generic";
  if (country === "de") return germany(g, options);
  if (country === "ro") return romania(g, options);
  return generic(g, options);
}

/** Which extra inputs a country pack understands — drives the UI form. */
export function netInputsFor(country: NetCountry): string[] {
  if (country === "de") return ["taxClass", "healthExtraRate", "churchTaxRate", "childless", "children", "extraFixedDeduction"];
  if (country === "ro") return ["personalDeduction", "itExempt", "taxRate", "extraFixedDeduction"];
  return ["contributionRate", "taxRate", "extraFixedDeduction"];
}

export function netCountryOf(country: string | null | undefined): NetCountry {
  const c = (country ?? "").toLowerCase();
  return c === "de" || c === "ro" ? c : "generic";
}
