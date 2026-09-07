import { describe, expect, it } from "vitest";
import { companyKey } from "@/lib/selfhost-tenant-binding.server";

describe("companyKey", () => {
  it("normalizes company names", () => {
    expect(companyKey({ customer: "  Acme   Logistics " })).toBe("name:acme logistics");
    expect(companyKey({ customer: "ACME Logistics" })).toBe(companyKey({ customer: "acme logistics" }));
  });

  it("separates different companies", () => {
    expect(companyKey({ customer: "Acme" })).not.toBe(companyKey({ customer: "Globex" }));
  });

  it("falls back to the install id when no company name is present", () => {
    expect(companyKey({ install_id: "ABC-123" })).toBe("install:abc-123");
    expect(companyKey({})).toBe("");
  });
});
