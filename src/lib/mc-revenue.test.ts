import { describe, expect, it } from "vitest";
import { approvalDate, inRevenuePeriod, totalRevenueOffers, validateRevenuePeriod } from "./mc-revenue";

describe("MC period reporting", () => {
  const period = { from: "2026-10-01", to: "2026-10-20" };
  it("includes both selected boundary days", () => {
    expect(inRevenuePeriod("2026-10-01T00:00:00Z", period)).toBe(true);
    expect(inRevenuePeriod("2026-10-20T23:59:59Z", period)).toBe(true);
    expect(inRevenuePeriod("2026-09-30T23:59:59Z", period)).toBe(false);
    expect(inRevenuePeriod("2026-10-21T00:00:00Z", period)).toBe(false);
  });
  it("supports all-time without losing dated offers", () => {
    expect(inRevenuePeriod("2020-01-01", {})).toBe(true);
  });
  it("rejects reversed periods", () => {
    expect(() => validateRevenuePeriod({ from: "2026-10-20", to: "2026-10-01" })).toThrow();
  });
  it("keeps approval date when saving an approved proposal again", () => {
    expect(approvalDate("accepted", { status: "accepted", accepted_at: "2026-10-01" }, "2026-10-20")).toBe("2026-10-01");
    expect(approvalDate("accepted", { status: "sent", accepted_at: null }, "2026-10-20")).toBe("2026-10-20");
  });
  it("totals approved values separately by currency", () => {
    const base = { id: "1", lead_id: "l", company: "Client", title: "Oferta", date: "2026-10-20", estimatedDate: false };
    expect(totalRevenueOffers([{ ...base, currency: "EUR", setup: 18000, monthly: 0, firstYear: 18000 }, { ...base, currency: "RON", setup: 5000, monthly: 500, firstYear: 11000 }])).toEqual([
      { currency: "EUR", setup: 18000, monthly: 0, firstYear: 18000, count: 1 },
      { currency: "RON", setup: 5000, monthly: 500, firstYear: 11000, count: 1 },
    ]);
  });
});