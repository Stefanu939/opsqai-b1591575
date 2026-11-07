/** Inbound requests are distinct from generated AI diagnostic notes. */
export const DIAGNOSTIC_REQUEST_SUBJECT = "Cerere diagnostic operațional";

type RequestActivity = { subject: string | null; body: string | null; created_at: string | null };

export function latestDiagnosticRequest(notes: string | null, activities: RequestActivity[]) {
  const latest = activities
    .filter((a) => a.subject === DIAGNOSTIC_REQUEST_SUBJECT && a.body)
    .reduce<RequestActivity | undefined>((newest, a) =>
      !newest || (a.created_at ?? "") > (newest.created_at ?? "") ? a : newest, undefined);
  // Legacy requests were stored in notes; retain them as a fallback only.
  const raw = latest?.body ?? notes ?? "";
  const role = raw.match(/Funcție:\s*(.+)/)?.[1]?.trim() ?? "";
  const message = raw.includes("[DIAGNOSTIC]")
    ? raw.split(/\n\s*\n/).slice(1).join("\n\n").trim()
    : raw.trim();
  return { role: role === "-" ? "" : role, message };
}