import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin, resolveCompanyForWrite } from "@/lib/authorization";
import { uuidString } from "@/lib/zod-uuid";

async function guard(context: { supabase: any; userId: string }) {
  await requirePlatformAdmin(context);
  const { isSelfHosted } = await import("@/lib/platform/mode");
  if (!isSelfHosted()) throw new Error("Microsoft 365 is available on Self-Hosted only.");
}

export const getMicrosoftSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guard(context);
    const m = await import("@/lib/microsoft/entra.server");
    const c = m.getMicrosoftConfig();
    const { mq } = await import("@/lib/microsoft/db.server");
    const sources = await mq<Record<string, unknown>>(
      `SELECT id, label, site_url, folder_path, category, enabled, last_sync_at::text, last_status, last_error, last_counts
         FROM public.sharepoint_sources ORDER BY created_at`,
    ).catch(() => []);
    return {
      tenantId: c.tenantId ?? "",
      clientId: c.clientId ?? "",
      hasSecret: Boolean(c.clientSecret),
      ssoEnabled: Boolean(c.ssoEnabled),
      configured: m.isMicrosoftConfigured(c),
      sources: sources as Array<{
        id: string; label: string; site_url: string; folder_path: string; category: string; enabled: boolean;
        last_sync_at: string | null; last_status: string | null; last_error: string | null;
        last_counts: Record<string, number> | null;
      }>,
    };
  });

export const saveMicrosoftSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().trim().max(200),
      clientId: z.string().trim().uuid(),
      clientSecret: z.string().max(500).optional(),
      ssoEnabled: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await guard(context);
    const m = await import("@/lib/microsoft/entra.server");
    if (!m.validTenant(data.tenantId)) throw new Error("Invalid tenant ID.");
    m.setMicrosoftConfig({ ...data, clientSecret: data.clientSecret?.trim() || undefined });
    const { mq } = await import("@/lib/microsoft/db.server");
    await mq(
      `INSERT INTO public.audit_log (actor_id, action, target, detail) VALUES ($1, 'microsoft.settings_saved', 'entra', $2)`,
      [context.userId, JSON.stringify({ module: "auth", severity: "warning", success: true, ssoEnabled: data.ssoEnabled })],
    ).catch(() => undefined);
    return { ok: true };
  });

/** Verifies the app registration can get a Graph token (secret + tenant correct). */
export const testMicrosoftConnection = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guard(context);
    const m = await import("@/lib/microsoft/entra.server");
    try {
      await m.getGraphAppToken();
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

export const addSharePointSource = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({
      label: z.string().trim().min(1).max(120),
      site_url: z.string().trim().url().max(500),
      folder_path: z.string().trim().max(400).default(""),
      category: z.string().trim().min(1).max(60).default("sharepoint"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await guard(context);
    const { resolveSource } = await import("@/lib/microsoft/sharepoint-sync.server");
    const r = await resolveSource(data.site_url, data.folder_path);
    const companyId = await resolveCompanyForWrite(context, null);
    const { mq } = await import("@/lib/microsoft/db.server");
    const [row] = await mq<{ id: string }>(
      `INSERT INTO public.sharepoint_sources (company_id, label, site_url, folder_path, category, site_id, drive_id, folder_item_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [companyId, data.label, data.site_url, data.folder_path, data.category, r.siteId, r.driveId, r.folderItemId, context.userId],
    );
    return { id: row.id };
  });

export const syncSharePointNow = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context);
    const { syncSharePointSource } = await import("@/lib/microsoft/sharepoint-sync.server");
    return syncSharePointSource(data.id);
  });

export const setSharePointSourceEnabled = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    await mq("UPDATE public.sharepoint_sources SET enabled = $2 WHERE id = $1", [data.id, data.enabled]);
    return { ok: true };
  });

export const removeSharePointSource = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context);
    const { mq } = await import("@/lib/microsoft/db.server");
    // Imported documents stay in the Knowledge Base; only the sync stops.
    await mq("DELETE FROM public.sharepoint_sources WHERE id = $1", [data.id]);
    return { ok: true };
  });

/** Original location of a KB document (SharePoint link), for the citation "open source" button. */
export const getDocumentSourceUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ document_id: uuidString() }).parse(d))
  .handler(async ({ data }) => {
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) return { url: null as string | null };
    const { mq } = await import("@/lib/microsoft/db.server");
    const rows = await mq<{ source_url: string | null }>(
      "SELECT source_url FROM public.knowledge_documents WHERE id = $1",
      [data.document_id],
    ).catch(() => []);
    const url = rows[0]?.source_url ?? null;
    return { url: url && /^https:\/\/[a-z0-9-]+\.sharepoint\.com\//i.test(url) ? url : null };
  });
