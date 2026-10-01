// SharePoint folder → Knowledge Base incremental sync (Self-Hosted only).
//
// Uses Microsoft Graph app-only access (Sites.Read.All + Files.Read.All,
// granted by the customer's admin) and the drive delta API, so each run only
// downloads files that are new or changed since the previous run.
//  - new file      → new KB document (source_url = SharePoint link)
//  - changed file  → new KB version; previous version deactivated
//  - deleted file  → KB document deactivated (kept for audit, not used in answers)
// Files are processed on this server; nothing is sent to OPSQAI Cloud.

import { graphDownload, graphGet, isMicrosoftConfigured } from "./entra.server";
import { mq } from "./db.server";

const KB_BUCKET = "knowledge-docs";
const SUPPORTED = /\.(pdf|docx|txt|md)$/i;
const MAX_BYTES = 30 * 1024 * 1024;

export interface SharePointSourceRow {
  id: string;
  company_id: string;
  label: string;
  site_url: string;
  folder_path: string;
  site_id: string | null;
  drive_id: string | null;
  folder_item_id: string | null;
  category: string;
  department_id: string | null;
  delta_link: string | null;
  enabled: boolean;
  last_sync_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_counts: Record<string, number> | null;
  created_by: string | null;
}

interface DriveItem {
  id: string;
  name?: string;
  eTag?: string;
  webUrl?: string;
  size?: number;
  deleted?: unknown;
  file?: { mimeType?: string };
  folder?: unknown;
  parentReference?: { path?: string; id?: string };
}

function normFolder(p: string): string {
  return p.trim().replace(/^\/+|\/+$/g, "");
}

/** Resolve site → default document library → folder, once per source. */
export async function resolveSource(siteUrl: string, folderPath: string) {
  const u = new URL(siteUrl);
  if (!u.hostname.endsWith(".sharepoint.com")) throw new Error("Use a https://<tenant>.sharepoint.com/sites/... link.");
  const sitePath = u.pathname.replace(/\/+$/, "");
  const site = await graphGet<{ id: string }>(
    sitePath && sitePath !== "/" ? `/sites/${u.hostname}:${sitePath}` : `/sites/${u.hostname}`,
  );
  const drive = await graphGet<{ id: string }>(`/sites/${site.id}/drive`);
  const folder = normFolder(folderPath);
  const item = await graphGet<{ id: string }>(
    folder ? `/drives/${drive.id}/root:/${folder.split("/").map(encodeURIComponent).join("/")}` : `/drives/${drive.id}/root`,
  );
  return { siteId: site.id, driveId: drive.id, folderItemId: item.id };
}

function inFolder(item: DriveItem, folder: string): boolean {
  if (!folder) return true;
  const path = decodeURIComponent(item.parentReference?.path ?? "");
  const rel = path.replace(/^\/drives?\/[^/]*\/?root:?/i, "").replace(/^\/drive\/root:?/i, "").replace(/^\/+/, "");
  return rel === folder || rel.startsWith(`${folder}/`);
}

const running = new Set<string>();

export async function syncSharePointSource(sourceId: string): Promise<Record<string, number>> {
  if (running.has(sourceId)) throw new Error("A sync for this folder is already running.");
  running.add(sourceId);
  const counts = { added: 0, updated: 0, removed: 0, skipped: 0, failed: 0 };
  try {
    if (!isMicrosoftConfigured()) throw new Error("Microsoft 365 is not configured.");
    const [src] = await mq<SharePointSourceRow>("SELECT * FROM public.sharepoint_sources WHERE id = $1", [sourceId]);
    if (!src) throw new Error("Source not found");
    await mq("UPDATE public.sharepoint_sources SET last_status = 'running', last_error = NULL WHERE id = $1", [sourceId]);

    let { drive_id: driveId } = src;
    if (!driveId || !src.site_id) {
      const r = await resolveSource(src.site_url, src.folder_path);
      driveId = r.driveId;
      await mq(
        "UPDATE public.sharepoint_sources SET site_id = $2, drive_id = $3, folder_item_id = $4 WHERE id = $1",
        [sourceId, r.siteId, r.driveId, r.folderItemId],
      );
    }
    const folder = normFolder(src.folder_path);
    let next: string | null = src.delta_link ?? `/drives/${driveId}/root/delta`;
    let deltaLink: string | null = null;
    const changed: DriveItem[] = [];
    const deleted: string[] = [];
    while (next) {
      const page: { value: DriveItem[]; "@odata.nextLink"?: string; "@odata.deltaLink"?: string } = await graphGet(next);
      for (const it of page.value) {
        if (it.deleted) deleted.push(it.id);
        else if (it.file && it.name && inFolder(it, folder)) changed.push(it);
      }
      next = page["@odata.nextLink"] ?? null;
      deltaLink = page["@odata.deltaLink"] ?? deltaLink;
    }

    for (const id of deleted) {
      const rows = await mq(
        `UPDATE public.knowledge_documents SET is_active = false, replaced_at = now(), change_notes = 'Removed from SharePoint'
          WHERE external_source = 'sharepoint' AND external_item_id = $1 AND is_active RETURNING id`,
        [id],
      );
      counts.removed += rows.length;
    }

    const { getKnowledgeRepository, getStorageProvider } = await import("@/lib/providers/registry");
    const { runProcessingPipeline } = await import("@/lib/kb.functions");
    const repo = getKnowledgeRepository(undefined);
    const storage = getStorageProvider();

    for (const it of changed) {
      if (!SUPPORTED.test(it.name!) || (it.size ?? 0) > MAX_BYTES) {
        counts.skipped += 1;
        continue;
      }
      const [prev] = await mq<{ id: string; version: number; external_etag: string | null }>(
        `SELECT id, version, external_etag FROM public.knowledge_documents
          WHERE external_source = 'sharepoint' AND external_item_id = $1 AND is_active
          ORDER BY version DESC LIMIT 1`,
        [it.id],
      );
      if (prev && prev.external_etag && prev.external_etag === it.eTag) {
        counts.skipped += 1;
        continue;
      }
      try {
        const bytes = await graphDownload(`/drives/${driveId}/items/${it.id}/content`);
        const safe = it.name!.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `${src.company_id}/sharepoint/${Date.now()}-${safe}`;
        const fileType = it.file?.mimeType || "application/octet-stream";
        await storage.put({ bucket: KB_BUCKET, key, body: bytes, contentType: fileType });
        const doc = await repo.insertDocument({
          company_id: src.company_id,
          title: it.name!.replace(/\.[^.]+$/, ""),
          category: src.category,
          doc_code: null,
          file_path: key,
          file_type: fileType,
          uploaded_by: src.created_by,
        } as Parameters<typeof repo.insertDocument>[0]);
        await mq(
          `UPDATE public.knowledge_documents
              SET source_url = $2, external_source = 'sharepoint', external_item_id = $3, external_etag = $4,
                  department_id = COALESCE($5, department_id),
                  parent_document_id = $6, version = $7,
                  change_notes = CASE WHEN $6::uuid IS NULL THEN 'Imported from SharePoint' ELSE 'Updated in SharePoint' END
            WHERE id = $1`,
          [doc.id, it.webUrl ?? null, it.id, it.eTag ?? null, src.department_id, prev?.id ?? null, (prev?.version ?? 0) + 1],
        );
        try {
          await runProcessingPipeline(doc.id, doc.company_id, key, fileType, it.name!);
        } catch (err) {
          await repo.markFailed(doc.id, err instanceof Error ? err.message : String(err));
          throw err;
        }
        if (prev) {
          await mq(
            "UPDATE public.knowledge_documents SET is_active = false, replaced_at = now() WHERE id = $1",
            [prev.id],
          );
          counts.updated += 1;
        } else counts.added += 1;
      } catch (err) {
        counts.failed += 1;
        console.error("[sharepoint:file]", it.name, err instanceof Error ? err.message : err);
      }
    }

    await mq(
      `UPDATE public.sharepoint_sources
          SET delta_link = COALESCE($2, delta_link), last_sync_at = now(),
              last_status = $3, last_error = NULL, last_counts = $4
        WHERE id = $1`,
      [sourceId, deltaLink, counts.failed ? "partial" : "ok", JSON.stringify(counts)],
    );
    await mq(
      `INSERT INTO public.audit_log (actor_id, action, target, detail) VALUES (NULL, 'sharepoint.sync', $1, $2)`,
      [src.label, JSON.stringify({ module: "kb", severity: counts.failed ? "warning" : "info", success: true, ...counts })],
    ).catch(() => undefined);
    return counts;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await mq(
      "UPDATE public.sharepoint_sources SET last_status = 'error', last_error = $2, last_sync_at = now() WHERE id = $1",
      [sourceId, msg.slice(0, 500)],
    ).catch(() => undefined);
    throw err;
  } finally {
    running.delete(sourceId);
  }
}

// ── Background schedule: every 30 minutes, all enabled sources ───────────
let timer: ReturnType<typeof setInterval> | null = null;
export function startSharePointScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    void (async () => {
      try {
        if (!isMicrosoftConfigured()) return;
        const rows = await mq<{ id: string }>("SELECT id FROM public.sharepoint_sources WHERE enabled");
        for (const r of rows) await syncSharePointSource(r.id).catch(() => undefined);
      } catch {
        /* table missing before migration, or DB unavailable — retry next tick */
      }
    })();
  }, 30 * 60_000);
  (timer as { unref?: () => void }).unref?.();
}
