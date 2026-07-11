import { describe, it, expect } from "vitest";
import { DR_SCENARIOS, findDrScenario } from "@/lib/dr-scenarios";

describe("DR scenarios catalog", () => {
  it("has the 7 canonical scenarios", () => {
    expect(DR_SCENARIOS.length).toBe(7);
  });
  it("has unique ids", () => {
    const ids = DR_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every scenario has at least one recovery path", () => {
    for (const s of DR_SCENARIOS) expect(s.paths.length).toBeGreaterThan(0);
  });
  it("findDrScenario resolves by id", () => {
    expect(findDrScenario("db_restore_same_host")?.title).toContain("same host");
    expect(findDrScenario("nope")).toBeUndefined();
  });
});
