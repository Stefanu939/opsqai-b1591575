/**
 * Enterprise Export & Migration server functions.
 * Supports three modes for KB / FAQ / full Workspace exports:
 *   - "only"    : export to ZIP, no side effects
 *   - "migrate" : export + manifest tailored for re-import into another OPSQAI
 *   - "delete"  : export, verify checksum, then permanently delete source rows
 *
 * Each operation creates a row in the exports repository and writes an
 * audit entry. Storage goes through the platform-agnostic IStorageProvider
 * (bucket "exports") so this works identically on Cloud and Self-Hosted.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import JSZip from "jszip";
import { createHash } from "node:crypto";
import { getActorRoles, getProfileCompany } from "@/lib/authorization";
import { assertModuleForCompany } from "@/lib/license-enforcement.server";
import { uuidString } from "@/lib/zod-uuid";
import { getExportRepository, getStorageProvider } from "@/lib/providers/registry";

const AUDIT_MODULE = "audit_log" as const;

async function enforceAudit(context: { supabase: any; userId: string }, hint?: string | null) {
  const companyId = hint ?? (await getProfileCompany(context.supabase, context.userId));
  await assertModuleForCompany(
    companyId ?? "00000000-0000-0000-0000-000000000000",
    AUDIT_MODULE,
  );
}

const BUCKET = "exports";
const PACKAGE_VERSION = "1.0.0";
const Uuid = uuidString();
const optionalUiUuid = z.preprocess(
  (value) => (typeof value === "string" && Uuid.safeParse(value).success ? value : undefined),
  Uuid.optional(),
);

type Mode = "only" | "migrate" | "delete";
type Kind = "kb" | "faq" | "workspace";

const InputSchema = z.object({
  kind: z.enum(["kb", "faq", "workspace"]),
  mode: z.enum(["only", "migrate", "delete"]),
  format: z.enum(["zip", "json", "csv", "markdown"]).default("zip"),
  company_id: optionalUiUuid,
  delete_confirmation: z.string().optional(), // must equal "DELETE" for mode=delete
});

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(",")).join("\n");
  return `${head}\n${body}\n`;
}

async function resolveScope(supabase: any, userId: string, hint?: string) {
  const actor = await getActorRoles(supabase, userId);
  const profileCompany = await getProfileCompany(supabase, userId);
  const companyId = actor.isPlatformAdmin && hint ? hint : profileCompany;
  if (!companyId) throw new Error("No company assigned");
  if (!actor.isPlatformAdmin && companyId !== profileCompany) {
    throw new Error("Forbidden");
  }
  return { actor, companyId, profileCompany };
}

function canDelete(actor: { isPlatformAdmin: boolean; roles: string[] }) {
  return actor.isPlatformAdmin || actor.roles.includes("workspace_owner");
}
function canExport(actor: {
  isPlatformAdmin: boolean;
  isCompanyAdmin: boolean;
  isManager: boolean;
  roles: string[];
}) {
  return (
    actor.isPlatformAdmin ||
    actor.isCompanyAdmin ||
    actor.isManager ||
    actor.roles.includes("workspace_owner")
  );
}

/* ----------------------------------------------------------------- */
/* Package builder                                                    */
/* ----------------------------------------------------------------- */

interface PackageInfo {
  bytes: Uint8Array;
  sha256: string;
  fileCount: number;
  manifest: Record<string, unknown>;
}

async function buildPackage(
  kind: Kind,
  snapshot: any,
  meta: { companyId: string; createdBy: string; mode: Mode },
): Promise<PackageInfo> {
  const zip = new JSZip();
  let fileCount = 0;
  const counts: Record<string, number> = {};
  const add = (path: string, body: string | Uint8Array) => {
    zip.file(path, body);
    fileCount += 1;
  };

  // Always include a JSON dump (machine-readable) and a Markdown summary.
  const root = `${kind}/`;
  add(`${root}data.json`, JSON.stringify(snapshot, null, 2));

  if (kind === "kb") {
    counts.documents = snapshot.documents.length;
    counts.chunks = snapshot.chunks.length;
    counts.tags = snapshot.tags.length;
    counts.categories = snapshot.categories.length;
    add(`${root}documents.csv`, toCsv(snapshot.documents));
    add(`${root}chunks.csv`, toCsv(snapshot.chunks));
    const md = snapshot.documents
      .map(
        (d: any) =>
          `# ${d.doc_code ?? ""} ${d.title}\n\n` +
          `_Category: ${d.category} · v${d.version} · ${new Date(d.created_at).toISOString().slice(0, 10)}_\n\n` +
          (d.content_text ?? ""),
      )
      .join("\n\n---\n\n");
    add(`${root}documents.md`, md);
  } else if (kind === "faq") {
    counts.faqs = snapshot.faqs.length;
    add(`${root}faqs.csv`, toCsv(snapshot.faqs));
    const md = snapshot.faqs
      .map(
        (f: any) =>
          `### ${f.question_en || f.question_de || ""}\n\n` +
          `_${f.category ?? "general"}_\n\n${f.answer_en || f.answer_de || ""}`,
      )
      .join("\n\n---\n\n");
    add(`${root}faqs.md`, md);
  } else {
    counts.documents = snapshot.kb.documents.length;
    counts.chunks = snapshot.kb.chunks.length;
    counts.faqs = snapshot.faq.faqs.length;
    counts.users = snapshot.users.length;
    counts.roles = snapshot.roles.length;
    add(`kb/documents.csv`, toCsv(snapshot.kb.documents));
    add(`kb/chunks.csv`, toCsv(snapshot.kb.chunks));
    add(`faq/faqs.csv`, toCsv(snapshot.faq.faqs));
    add(`users/users.csv`, toCsv(snapshot.users));
    add(`users/roles.csv`, toCsv(snapshot.roles));
    add(`workspace/company.json`, JSON.stringify(snapshot.company, null, 2));
    add(`workspace/settings.json`, JSON.stringify(snapshot.settings, null, 2));
  }

  const manifest = {
    package_version: PACKAGE_VERSION,
    product: "OPSQAI",
    kind,
    mode: meta.mode,
    company_id: meta.companyId,
    created_by: meta.createdBy,
    created_at: new Date().toISOString(),
    counts,
    notes:
      meta.mode === "migrate"
        ? "Re-import this archive into another OPSQAI workspace via the platform admin migration tool."
        : meta.mode === "delete"
          ? "This archive was generated immediately before the source data was permanently deleted from the workspace."
          : "Read-only export. No source data was modified.",
  };
  add(`manifest.json`, JSON.stringify(manifest, null, 2));
  add(
    `README.md`,
    `# OPSQAI ${kind.toUpperCase()} Export\n\nPackage version: ${PACKAGE_VERSION}\nMode: ${meta.mode}\nGenerated: ${manifest.created_at}\n`,
  );

  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { bytes, sha256, fileCount, manifest };
}

/* ----------------------------------------------------------------- */
/* Public server functions                                            */
/* ----------------------------------------------------------------- */

export const runExport = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { actor, companyId } = await resolveScope(
      context.supabase,
      context.userId,
      data.company_id,
    );
    if (!canExport(actor)) throw new Error("Forbidden: export permission required");
    if (data.mode === "delete") {
      if (!canDelete(actor))
        throw new Error("Forbidden: only Workspace Owner or Super Admin may delete");
      if (data.delete_confirmation !== "DELETE")
        throw new Error('Type "DELETE" to confirm permanent removal');
    }

    const repo = getExportRepository(context.supabase);
    const storage = getStorageProvider();

    // Create export row in queued state.
    const { id: jobId } = await repo.createJob({
      companyId,
      kind: data.kind,
      mode: data.mode,
      format: data.format,
      createdBy: context.userId,
    });

    try {
      // 1. Snapshot
      const snapshot =
        data.kind === "kb"
          ? await repo.snapshotKb(companyId)
          : data.kind === "faq"
            ? await repo.snapshotFaq(companyId)
            : await repo.snapshotWorkspace(companyId);

      // 2. Build package
      const pkg = await buildPackage(data.kind, snapshot, {
        companyId,
        createdBy: context.userId,
        mode: data.mode,
      });

      // 3. Upload to storage (partitioned by company id)
      const storagePath = `${companyId}/${data.kind}/${jobId}.zip`;
      await storage.put({
        bucket: BUCKET,
        key: storagePath,
        body: pkg.bytes,
        contentType: "application/zip",
      });

      // 4. Verify integrity (download and re-hash)
      const downloaded = await storage.get(BUCKET, storagePath);
      const verifySha = createHash("sha256").update(downloaded).digest("hex");
      if (verifySha !== pkg.sha256) throw new Error("Integrity check failed: checksum mismatch");

      await repo.markCompleted(jobId, {
        storagePath,
        sha256: pkg.sha256,
        bytes: pkg.bytes.byteLength,
        fileCount: pkg.fileCount,
        manifest: pkg.manifest as any,
      });

      // 5. Optional deletion
      let deletedCounts: Record<string, number> = {};
      if (data.mode === "delete") {
        deletedCounts = await performDelete(repo, data.kind, companyId);
        await repo.markDeleted(jobId, data.delete_confirmation ?? null);
      }

      // 6. Audit
      await repo.writeAudit({
        companyId,
        userId: context.userId,
        module: data.kind === "workspace" ? "workspace" : data.kind,
        action:
          data.mode === "delete"
            ? "export_and_delete"
            : data.mode === "migrate"
              ? "export_migrate"
              : "export",
        resource: jobId,
        payload: {
          summary: `${data.kind} ${data.mode} export — ${pkg.fileCount} files, ${pkg.bytes.byteLength} bytes`,
          sha256: pkg.sha256,
          counts: pkg.manifest.counts ?? {},
          deleted: deletedCounts,
        } as any,
        severity: data.mode === "delete" ? "warning" : "info",
        success: true,
      });

      // 7. Download payload — base64 works identically on Cloud (object
      // storage) and Self-Hosted (local filesystem); the client turns it
      // into a `data:` URL / blob for download.
      let binary = "";
      for (const b of pkg.bytes) binary += String.fromCharCode(b);
      const downloadUrl = `data:application/zip;base64,${btoa(binary)}`;

      return {
        ok: true as const,
        job_id: jobId,
        sha256: pkg.sha256,
        bytes: pkg.bytes.byteLength,
        download_url: downloadUrl,
        deleted: deletedCounts,
      };
    } catch (err) {
      await repo.markFailed(jobId, err instanceof Error ? err.message : String(err));
      await repo.writeAudit({
        companyId,
        userId: context.userId,
        module: data.kind,
        action: "export_failed",
        resource: jobId,
        payload: { error: err instanceof Error ? err.message : String(err) } as any,
        severity: "error",
        success: false,
      });
      throw err;
    }
  });

async function performDelete(repo: ReturnType<typeof getExportRepository>, kind: Kind, companyId: string) {
  const counts: Record<string, number> = {};
  if (kind === "kb" || kind === "workspace") {
    counts.documents = await repo.deleteKbData(companyId);
  }
  if (kind === "faq" || kind === "workspace") {
    counts.faqs = await repo.deleteFaqData(companyId);
  }
  return counts;
}

export const listExports = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const companyId = await getProfileCompany(context.supabase, context.userId);
    if (!companyId) return { exports: [] };
    const repo = getExportRepository(context.supabase);
    const exports = await repo.listJobs(companyId, 50);
    return { exports };
  });

export const getExportDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    const repo = getExportRepository(context.supabase);
    const storagePath = await repo.getStoragePath(data.id);
    if (!storagePath) throw new Error("Export not available");
    const bytes = await getStorageProvider().get(BUCKET, storagePath);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return { url: `data:application/zip;base64,${btoa(binary)}` };
  });

/* ----------------------------------------------------------------- */
/* Hierarchy reads (thin wrappers around RPCs) — Cloud-only surfaces   */
/* used by the platform-admin knowledge-gap / audit dashboards.       */
/* ----------------------------------------------------------------- */

import { getCloudSupabase } from "@/lib/providers/not-available";

export const listGapCompanies = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data, error } = await getCloudSupabase(context, "exports").rpc("gap_companies");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listGapUsers = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ company_id: optionalUiUuid }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.company_id) return [];
    const { data: rows, error } = await getCloudSupabase(context, "exports").rpc("gap_users", {
      p_company: data.company_id,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listGapUserQuestions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: optionalUiUuid,
        user_id: optionalUiUuid,
        status: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        department_id: optionalUiUuid,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!data.company_id || !data.user_id) return [];
    const { data: rows, error } = await getCloudSupabase(context, "exports").rpc("gap_user_questions", {
      p_company: data.company_id,
      p_user: data.user_id,
      p_status: data.status ?? undefined,
      p_from: data.from ?? undefined,
      p_to: data.to ?? undefined,
      p_department: data.department_id ?? undefined,
    } as any);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getKnowledgeHealth = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ company_id: optionalUiUuid }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.company_id) return null;
    const { data: row, error } = await getCloudSupabase(context, "exports").rpc("knowledge_health", {
      p_company: data.company_id,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const listAuditCompanies = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await enforceAudit(context, null);
    const { data, error } = await getCloudSupabase(context, "exports").rpc("audit_companies");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAuditUsers = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ company_id: optionalUiUuid }).parse(d))
  .handler(async ({ data, context }) => {
    await enforceAudit(context, (data as any)?.company_id ?? null);
    if (!data.company_id) return [];
    const { data: rows, error } = await getCloudSupabase(context, "exports").rpc("audit_users", {
      p_company: data.company_id,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listAuditEntries = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: optionalUiUuid,
        user_id: optionalUiUuid,
        module: z.string().optional(),
        action: z.string().optional(),
        severity: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforceAudit(context, (data as any)?.company_id ?? null);
    if (!data.company_id || !data.user_id) return [];
    const { data: rows, error } = await getCloudSupabase(context, "exports").rpc("audit_entries", {
      p_company: data.company_id,
      p_user: data.user_id,
      p_module: data.module ?? undefined,
      p_action: data.action ?? undefined,
      p_severity: data.severity ?? undefined,
      p_from: data.from ?? undefined,
      p_to: data.to ?? undefined,
      p_limit: data.limit ?? 200,
    } as any);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
