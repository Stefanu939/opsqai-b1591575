// Best-effort audit trail for knowledge-document file operations.
// Self-Hosted writes to the local append-only public.audit_log so the
// Activity Log shows who uploaded, replaced or deleted each file.

export async function auditDocumentEvent(
  actorId: string,
  action: "document.upload" | "document.version_replace" | "document.delete",
  target: string,
  detail: Record<string, unknown>,
): Promise<void> {
  try {
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted() || !process.env.DATABASE_URL) return;
    const { Pool } = await import("pg");
    const p = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    try {
      await p.query(
        `INSERT INTO public.audit_log (actor_id, action, target, detail) VALUES ($1,$2,$3,$4::jsonb)`,
        [
          actorId,
          action,
          target,
          JSON.stringify({
            module: "kb",
            severity: action === "document.delete" ? "warning" : "info",
            success: true,
            ...detail,
          }),
        ],
      );
    } finally {
      await p.end();
    }
  } catch (e) {
    console.error("[doc-audit]", action, e);
  }
}
