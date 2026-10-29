import { describe, expect, it } from "vitest";
import { estimateIndustryLoss } from "./industry-loss";

describe("estimateIndustryLoss", () => {
  it("40 trucks reproduce the 5,000 €/month transport case", () => {
    expect(estimateIndustryLoss("transport", 40).monthly).toBe(5000);
  });
  it("12 bays reproduce the 3,000 €/month service case", () => {
    expect(estimateIndustryLoss("service-auto", 12).monthly).toBe(3000);
  });
  it("150 employees reproduce the 6,500 €/month production case", () => {
    expect(estimateIndustryLoss("production", 150).monthly).toBe(6500);
  });
  it("10 branches reproduce the 8,000 €/month banking case", () => {
    expect(estimateIndustryLoss("banking", 10).monthly).toBe(8000);
  });
  it("scales linearly: 80 trucks = 10,000 €/month, 120,000 €/year", () => {
    const r = estimateIndustryLoss("transport", 80);
    expect(r.monthly).toBe(10000);
    expect(r.yearly).toBe(120000);
  });
  it("negative input counts as zero", () => {
    expect(estimateIndustryLoss("transport", -5).monthly).toBe(0);
  });
});
