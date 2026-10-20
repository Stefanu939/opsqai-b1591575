import { describe, expect, it } from "vitest";
import { summarizeOffer } from "./crm.functions";

const base = { id: "1", lead_id: "l", title: "t", accepted_at: null, crm_leads: { company_name: "ARC GRUP" } };

describe("approved offer breakdown", () => {
  it("first year = implementation + 12 × monthly", () => {
    const o = summarizeOffer({ ...base, amount: 99, setup_amount: 12000, monthly_amount: 900 });
    expect(o.setup).toBe(12000);
    expect(o.monthly).toBe(900);
    expect(o.firstYear).toBe(22800);
  });
  it("legacy offers without split count the whole amount as one-off", () => {
    const o = summarizeOffer({ ...base, amount: 5000, setup_amount: null, monthly_amount: null });
    expect(o.setup).toBe(5000);
    expect(o.monthly).toBe(0);
  });
});
