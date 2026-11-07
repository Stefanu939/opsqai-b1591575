import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_REQUEST_SUBJECT, latestDiagnosticRequest } from "./diagnostic-request";

describe("latest diagnostic request", () => {
  it("uses the latest returning-contact request, not staff notes or generated output", () => {
    const notes = "[ANAF] · CUI 22116694\nCall notes: offer discussed";
    const activities = [
      { subject: DIAGNOSTIC_REQUEST_SUBJECT, body: "[DIAGNOSTIC]\nFuncție: Director\n\nOld request about invoices", created_at: "2026-11-01T10:00:00Z" },
      { subject: "Diagnostic operațional AI", body: "Previous AI output", created_at: "2026-11-07T12:00:00Z" },
      { subject: DIAGNOSTIC_REQUEST_SUBJECT, body: "[DIAGNOSTIC]\nFuncție: Manager\n\nNew request about inventory\n\nSecond paragraph", created_at: "2026-11-07T11:00:00Z" },
    ];
    expect(latestDiagnosticRequest(notes, activities)).toEqual({ role: "Manager", message: "New request about inventory\n\nSecond paragraph" });
  });

  it("keeps legacy diagnostic requests available when there is no request history", () => {
    expect(latestDiagnosticRequest("[DIAGNOSTIC]\nFuncție: -\n\nLegacy client request", [])).toEqual({ role: "", message: "Legacy client request" });
  });
});