import { describe, expect, it } from "vitest";
import { resolveKaiConfirmation } from "./kai-confirmation";
import type { KaiAction } from "./kai.functions";

const pirelli: KaiAction = { type: "add_lead", label: "Adaugă Pirelli România în CRM", company_name: "Pirelli România" };
const other: KaiAction = { type: "add_lead", label: "Adaugă Acme în CRM", company_name: "Acme" };
describe("Kai explicit approvals", () => {
  it("matches an explicit named approval to the exact proposal", () => {
    expect(resolveKaiConfirmation("Confirm, poți trece firma Pirelli România în CRM", [pirelli, other])).toEqual({ kind: "matched", action: pirelli });
  });
  it("accepts a bare confirmation only for one proposal", () => {
    expect(resolveKaiConfirmation("confirm", [pirelli]).kind).toBe("matched");
    expect(resolveKaiConfirmation("confirm", [pirelli, other]).kind).toBe("ambiguous");
  });
  it("never treats negation, discussion or a different target as consent", () => {
    expect(resolveKaiConfirmation("Nu confirm", [pirelli]).kind).toBe("none");
    expect(resolveKaiConfirmation("Ce se întâmplă dacă confirm?", [pirelli]).kind).toBe("none");
    expect(resolveKaiConfirmation("Confirm firma Acme în CRM", [pirelli]).kind).toBe("ambiguous");
    expect(resolveKaiConfirmation("Confirm", []).kind).toBe("missing");
  });
  it("selects the requested kind without blanket approvals", () => {
    const task: KaiAction = { type: "task", label: "Task", title: "Sună HR", due_at: "2026-10-10T10:00" };
    expect(resolveKaiConfirmation("Confirm task", [pirelli, task])).toEqual({ kind: "matched", action: task });
    expect(resolveKaiConfirmation("Confirm tot", [pirelli, task]).kind).toBe("ambiguous");
    expect(resolveKaiConfirmation("Confirm, dar schimbă ora la 12", [task]).kind).toBe("ambiguous");
    expect(resolveKaiConfirmation("Confirm Pirelli România, dar schimbă emailul", [pirelli]).kind).toBe("ambiguous");
  });
});