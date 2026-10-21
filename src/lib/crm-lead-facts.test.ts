import { describe, expect, it } from "vitest";
import { isLandline, parseLeadFacts } from "./crm-lead-facts";

describe("lead facts", () => {
  it("extracts CUI and CAEN from ANAF notes", () => {
    const f = parseLeadFacts("[ANAF] · CUI 22116694 · CAEN 4941 Transporturi rutiere · 517 angajați");
    expect(f.cui).toBe("22116694");
    expect(f.caen?.startsWith("4941")).toBe(true);
    expect(f.staff).toBe("517");
  });
  it("flags Romanian landlines as not WhatsApp-capable", () => {
    expect(isLandline("0264 123 456")).toBe(true);
    expect(isLandline("+40749022202")).toBe(false);
  });
});
