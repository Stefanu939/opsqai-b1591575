import { describe, expect, it } from "vitest";
import {
  computeValue,
  defaultValueInputs,
  scenarios,
  searchLoss,
  type ValueInputs,
} from "@/lib/value-engine";

const base = (): ValueInputs => ({
  ...defaultValueInputs(),
  quick: { employees: 100, hourlyCost: 30, minutesPerDay: 15, workingDays: 220, improvementPct: 40 },
  investment: 20000,
});

describe("value engine", () => {
  it("derives the annual information search loss", () => {
    expect(searchLoss(base().quick)).toBe(165000);
  });

  it("computes level 1 potential, ROI and multiple", () => {
    const r = computeValue(base());
    expect(r.currentTotal).toBe(165000);
    expect(r.potentialValue).toBe(66000);
    // level 1 applies no likelihood discount
    expect(r.expectedValue).toBe(66000);
    expect(r.netValue).toBe(46000);
    expect(r.roiPct).toBe(230);
    expect(r.valueMultiple).toBe(3.3);
    expect(r.operationalImprovementPct).toBe(40);
  });

  it("applies likelihood only at level 3", () => {
    const r = computeValue({ ...base(), level: 3, likelihoodPct: 80 });
    expect(r.potentialValue).toBe(66000);
    expect(r.expectedValue).toBe(52800);
    expect(r.likelihoodPct).toBe(80);
  });

  it("adds level 2 drivers on top of the search driver", () => {
    const r = computeValue({
      ...base(),
      level: 2,
      drivers: [
        { key: "training", currentCost: 80000, impactPct: 30 },
        { key: "errors", currentCost: 120000, impactPct: 30 },
      ],
    });
    expect(r.currentTotal).toBe(365000);
    expect(r.potentialValue).toBe(66000 + 24000 + 36000);
    expect(r.topDrivers[0]?.key).toBe("search");
  });

  it("ignores a duplicate search driver row", () => {
    const r = computeValue({
      ...base(),
      level: 2,
      drivers: [{ key: "search", currentCost: 999999, impactPct: 100 }],
    });
    expect(r.currentTotal).toBe(165000);
  });

  it("survives zero investment and zero inputs", () => {
    const r = computeValue({
      ...base(),
      investment: 0,
      quick: { employees: 0, hourlyCost: 0, minutesPerDay: 0, workingDays: 0, improvementPct: 0 },
    });
    expect(r.currentTotal).toBe(0);
    expect(r.roiPct).toBe(0);
    expect(r.valueMultiple).toBe(0);
    expect(r.paybackMonths).toBeNull();
    expect(r.score.label).toBe("low");
  });

  it("produces three ordered scenarios", () => {
    const s = scenarios(base());
    expect(s.map((x) => x.label)).toEqual(["pessimistic", "base", "optimistic"]);
    expect(s[0]!.result.potentialValue).toBeLessThan(s[1]!.result.potentialValue);
    expect(s[2]!.result.potentialValue).toBeGreaterThan(s[1]!.result.potentialValue);
  });

  it("caps impact at 100 percent", () => {
    const r = computeValue({
      ...base(),
      level: 2,
      drivers: [{ key: "downtime", currentCost: 1000, impactPct: 500 }],
    });
    expect(r.drivers[1]?.value).toBe(1000);
  });
});
