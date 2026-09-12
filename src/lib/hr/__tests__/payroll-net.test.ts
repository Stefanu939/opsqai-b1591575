import { describe, expect, it } from "vitest";
import { estimateNet, germanIncomeTaxYear, netCountryOf, netInputsFor } from "../payroll-net";

describe("payroll net estimate", () => {
  it("germany: net is below gross and contributions are capped", () => {
    const low = estimateNet(3000, { country: "de", taxClass: 1, childless: true });
    expect(low.net).toBeGreaterThan(0);
    expect(low.net).toBeLessThan(3000);
    expect(low.totalDeductions).toBeCloseTo(low.contributions + low.taxes, 2);

    const high = estimateNet(20000, { country: "de" });
    const capped = high.lines.find((l) => l.code === "de.pension")!;
    expect(capped.amount).toBeCloseTo(Math.round(8050 * 0.093 * 100) / 100, 2);
    expect(high.employerCost).toBeGreaterThan(high.gross);
  });

  it("germany: tax free allowance yields no income tax on small gross", () => {
    expect(germanIncomeTaxYear(10000)).toBe(0);
    expect(germanIncomeTaxYear(40000)).toBeGreaterThan(0);
  });

  it("romania: 25% CAS, 10% CASS and 10% income tax", () => {
    const r = estimateNet(1000, { country: "ro" });
    expect(r.lines.find((l) => l.code === "ro.cas")!.amount).toBe(250);
    expect(r.lines.find((l) => l.code === "ro.cass")!.amount).toBe(100);
    expect(r.lines.find((l) => l.code === "ro.incomeTax")!.amount).toBe(65);
    expect(r.net).toBe(585);
  });

  it("romania: IT exemption removes the income tax", () => {
    const r = estimateNet(1000, { country: "ro", itExempt: true });
    expect(r.taxes).toBe(0);
    expect(r.net).toBe(650);
  });

  it("generic pack uses the rates HR entered", () => {
    const r = estimateNet(2000, { country: "generic", contributionRate: 10, taxRate: 20 });
    expect(r.contributions).toBe(200);
    expect(r.taxes).toBe(360);
    expect(r.net).toBe(1440);
  });

  it("never returns a negative net", () => {
    const r = estimateNet(0, { country: "de" });
    expect(r.net).toBe(0);
  });

  it("maps countries and exposes the inputs each pack needs", () => {
    expect(netCountryOf("DE")).toBe("de");
    expect(netCountryOf("at")).toBe("generic");
    expect(netInputsFor("ro")).toContain("personalDeduction");
    expect(netInputsFor("de")).toContain("taxClass");
  });
});
