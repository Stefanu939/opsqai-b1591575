/**
 * Country & compliance intelligence registry (Phase 3).
 *
 * Pure, browser-safe data module — no I/O, no server-only imports. Adding a
 * new country is a pure data addition: append an entry to `COUNTRIES` and,
 * if it references a framework that doesn't exist yet, add it to
 * `FRAMEWORKS`. Nothing else in the app needs to change.
 *
 * All wording produced from this registry (and consumed by the AI Audit
 * prompt builder) must stay strictly advisory — this module never asserts
 * legal compliance, only flags what an area of the product may be
 * "relevant to" or "requires review" against.
 */

export type FrameworkKey =
  | "gdpr"
  | "iso_27001"
  | "iso_9001"
  | "iso_45001"
  | "eu_ai_act"
  | "bdsg"
  | "legea_190_2018";

export interface FrameworkMeta {
  key: FrameworkKey;
  name: string;
  /** Short, strictly advisory description of what this framework covers. */
  description: string;
  /** Jurisdiction scope, for display next to the framework badge. */
  scope: "eu" | "national" | "international";
}

export const FRAMEWORKS: Record<FrameworkKey, FrameworkMeta> = {
  gdpr: {
    key: "gdpr",
    name: "GDPR",
    description:
      "EU General Data Protection Regulation — advisory reference for personal-data handling, consent and retention practices.",
    scope: "eu",
  },
  iso_27001: {
    key: "iso_27001",
    name: "ISO 27001",
    description:
      "Information security management — advisory reference for access control, risk treatment and security documentation.",
    scope: "international",
  },
  iso_9001: {
    key: "iso_9001",
    name: "ISO 9001",
    description:
      "Quality management systems — advisory reference for document control, process ownership and continual improvement.",
    scope: "international",
  },
  iso_45001: {
    key: "iso_45001",
    name: "ISO 45001",
    description:
      "Occupational health & safety management — advisory reference for hazard identification and safety procedures.",
    scope: "international",
  },
  eu_ai_act: {
    key: "eu_ai_act",
    name: "EU AI Act",
    description:
      "EU regulation on artificial intelligence — advisory reference for AI-system risk classification and transparency obligations.",
    scope: "eu",
  },
  bdsg: {
    key: "bdsg",
    name: "BDSG",
    description:
      "German Federal Data Protection Act — advisory reference that supplements GDPR with German-specific data-protection rules.",
    scope: "national",
  },
  legea_190_2018: {
    key: "legea_190_2018",
    name: "Legea 190/2018",
    description:
      "Romanian law implementing GDPR nationally — advisory reference for Romania-specific data-protection provisions.",
    scope: "national",
  },
};

export interface CountryComplianceConfig {
  code: string;
  name: string;
  defaultLanguage: string;
  /** Short, advisory note on the local data-protection context. */
  dataProtectionContext: string;
  /** Notes on terminology the AI/UI should prefer for this country. */
  terminologyNotes: string;
  applicableFrameworks: FrameworkKey[];
  /** Default document review cadence in days for this jurisdiction. */
  defaultReviewIntervalDays: number;
}

export const COUNTRIES: Record<string, CountryComplianceConfig> = {
  DE: {
    code: "DE",
    name: "Germany",
    defaultLanguage: "de",
    dataProtectionContext:
      "Germany applies GDPR alongside the national BDSG; works councils and employee data protection are typically a heightened area of attention.",
    terminologyNotes:
      "Prefer 'Verfahrensanweisung' for SOP and 'Datenschutzbeauftragter' for a data protection officer when addressing German-speaking users.",
    applicableFrameworks: ["gdpr", "bdsg", "iso_27001", "iso_9001", "iso_45001", "eu_ai_act"],
    defaultReviewIntervalDays: 365,
  },
  RO: {
    code: "RO",
    name: "Romania",
    defaultLanguage: "ro",
    dataProtectionContext:
      "Romania applies GDPR alongside Legea 190/2018, which sets national implementing provisions including on employee monitoring.",
    terminologyNotes:
      "Prefer 'Procedură operațională' for SOP and 'Responsabil cu protecția datelor' for a data protection officer when addressing Romanian-speaking users.",
    applicableFrameworks: [
      "gdpr",
      "legea_190_2018",
      "iso_27001",
      "iso_9001",
      "iso_45001",
      "eu_ai_act",
    ],
    defaultReviewIntervalDays: 365,
  },
  OTHER_EU: {
    code: "OTHER_EU",
    name: "Other / EU",
    defaultLanguage: "en",
    dataProtectionContext:
      "Generic EU fallback — GDPR applies; check for country-specific implementing legislation before relying on this configuration alone.",
    terminologyNotes:
      "Use neutral, English-first terminology (SOP, DPO) until a country-specific entry is added.",
    applicableFrameworks: ["gdpr", "iso_27001", "iso_9001", "iso_45001", "eu_ai_act"],
    defaultReviewIntervalDays: 365,
  },
};

export const DEFAULT_COUNTRY_CODE = "OTHER_EU";

/** List of countries for select inputs (installer wizard, first-run, org settings). */
export function listCountries(): CountryComplianceConfig[] {
  return Object.values(COUNTRIES);
}

/** Resolve a country config, falling back to the generic EU entry for unknown codes. */
export function resolveCountryConfig(code: string | null | undefined): CountryComplianceConfig {
  if (!code) return COUNTRIES[DEFAULT_COUNTRY_CODE];
  return COUNTRIES[code.toUpperCase()] ?? COUNTRIES[DEFAULT_COUNTRY_CODE];
}

/** Frameworks recommended (pre-selected) for a given country. */
export function frameworksForCountry(code: string | null | undefined): FrameworkMeta[] {
  return resolveCountryConfig(code).applicableFrameworks.map((k) => FRAMEWORKS[k]);
}

/** Metadata lookup for a set of framework keys, ignoring unknown keys. */
export function resolveFrameworks(keys: readonly string[] | null | undefined): FrameworkMeta[] {
  if (!keys) return [];
  return keys
    .map((k) => FRAMEWORKS[k as FrameworkKey])
    .filter((f): f is FrameworkMeta => !!f);
}

/**
 * Document review interval (days) to apply for a country/framework
 * combination. Currently uniform per country; kept as a function (not a
 * constant) so per-framework overrides can be layered in later without
 * changing callers.
 */
export function reviewIntervalDays(
  countryCode: string | null | undefined,
  _frameworkKey?: FrameworkKey,
): number {
  return resolveCountryConfig(countryCode).defaultReviewIntervalDays;
}

export function isKnownFrameworkKey(key: string): key is FrameworkKey {
  return key in FRAMEWORKS;
}
