import { beforeEach, expect, it, vi } from "vitest";
import { DIAGNOSTIC_REQUEST_SUBJECT, latestDiagnosticRequest } from "./diagnostic-request";

const state = vi.hoisted(() => ({
  notes: "[ANAF] · CUI 22116694\nCall notes: offer discussed",
  activities: [] as Array<{ subject: string; body: string; created_at: string }>,
  updates: [] as Array<Record<string, unknown>>,
  submissions: 0,
}));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/email/dispatch.server", () => ({ dispatchTransactionalEmail: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/diagnostic.server", () => ({
  generateDiagnosticText: vi.fn().mockResolvedValue("Generated diagnostic"),
  DIAGNOSTIC_SUBJECT: "Diagnostic operațional AI",
  stratoAutoSend: () => false,
}));
vi.mock("@/lib/providers/cloud/service-role.server", () => ({
  createServiceRoleClient: () => ({ from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, ilike: () => query, limit: () => query,
      update: (values: Record<string, unknown>) => {
        state.updates.push(values);
        if (typeof values.notes === "string") state.notes = values.notes;
        return query;
      },
      insert: (values: { subject: string; body: string; created_at: string }) => {
        if (table === "crm_activities") state.activities.push(values);
        if (table === "contact_submissions") state.submissions++;
        return query;
      },
      single: async () => ({ data: { id: "submission", reference_code: "REQ-TEST", created_at: `2026-11-07T12:00:0${state.submissions}Z` }, error: null }),
      maybeSingle: async () => ({ data: table === "crm_leads" ? { id: "lead", company_name: "Regression company" } : null }),
    };
    return query;
  } }),
}));

beforeEach(() => { state.activities.length = 0; state.updates.length = 0; state.submissions = 0; });

it("preserves existing CRM notes and every inbound request across repeated diagnostic submissions", async () => {
  const originalNotes = state.notes;
  const { Route } = await import("@/routes/api.public.contact-submit");
  const route = Route as unknown as { server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } } };
  for (const message of ["First request about invoices", "Latest request about inventory"]) {
    const response = await route.server.handlers.POST({ request: new Request("http://localhost/api/public/contact-submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Regression contact", email: "diagnostic-regression@example.invalid", subject: "demo", kind: "diagnostic", role: "Manager", message }),
    }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, referenceId: "REQ-TEST" });
  }
  expect(state.notes).toBe(originalNotes);
  expect(state.updates.every((update) => !("notes" in update))).toBe(true);
  const requests = state.activities.filter((activity) => activity.subject === DIAGNOSTIC_REQUEST_SUBJECT);
  expect(requests).toHaveLength(2);
  expect(requests[0]?.body).toContain("First request about invoices");
  expect(latestDiagnosticRequest(state.notes, state.activities).message).toBe("Latest request about inventory");
});