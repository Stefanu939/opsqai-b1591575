import { describe, expect, it } from "vitest";
import { calculateOperationalImpact } from "../operational-impact";

const inputs = { employees: 50, minutes: 20, hourlyCost: 35, workingDays: 220, recoveredMinutes: 5 };

describe("operational capacity scenario", () => {
  it("values annual search time from inputs, not a benchmark percentage", () => {
    const result = calculateOperationalImpact(inputs);
    expect(result.searchHours).toBeCloseTo(3666.666667);
    expect(result.searchCost).toBeCloseTo(128333.333333);
  });
  it("values only the explicitly hypothetical recovered minutes", () => {
    expect(calculateOperationalImpact(inputs).recoveredValue).toBeCloseTo(32083.333333);
    expect(calculateOperationalImpact({ ...inputs, recoveredMinutes: 0 }).recoveredValue).toBe(0);
  });
  it("cannot recover more time than was lost", () => {
    const result = calculateOperationalImpact({ ...inputs, recoveredMinutes: 100 });
    expect(result.recoveredHours).toBe(result.searchHours);
    expect(result.remainingCost).toBe(0);
  });
  it("rejects negative and non-finite input values", () => {
    expect(calculateOperationalImpact({ ...inputs, employees: -5 }).searchCost).toBe(0);
    expect(calculateOperationalImpact({ ...inputs, hourlyCost: Infinity }).searchCost).toBe(0);
    expect(calculateOperationalImpact({ ...inputs, minutes: NaN }).recoveredHours).toBe(0);
  });
});