import { getCloudSupabase } from "@/lib/providers/not-available";
/**
 * Enterprise Export & Migration server functions.
 * Supports three modes for KB / FAQ / full Workspace exports:
 *   - "only"    : export to ZIP, no side effects
 *   - "migrate" : export + manifest tailored for re-import into another OPSQAI
 *   - "delete"  : export, verify checksum, then permanently delete source rows
 *
 * Each operation creates a row in `public.exports` and writes an audit entry
 * via the `audit_write` RPC.  Storage is partitioned by company id.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import JSZip from "jszip";
import { createHash } from "node:crypto";
import { getActorRoles, getProfileCompany } from "@/lib/authorization";
import { assertModuleForCompany } from "@/lib/license-enforcement.server";

const AUDIT_MODULE = "audit_log" as const;

async function enforceAudit(context: { supabase: any; userId: string }, hint?: string | null) {
  const companyId = hint ?? (await getProfileCompany(getCloudSupabase(context, "exports"), context.userId));
  await assertModuleForCompany(
    companyId ?? "00000000-0000-0000-0000-000000000000",
    AUDIT_MODULE,
  );
}

const BUCKET = "workspace-exports";
const PACKAGE_VERSION = "1.0.0";
const Uuid = z.string().uuid();
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
/* Snapshot helpers (read-only)                                       */
/* ----------------------------------------------------------------- */

async function snapshotKb(supabase: any, companyId: string) {
  const { data: documents } = await supabase
    .from("knowledge_documents")
    .select("*")
    .eq("company_id", companyId);
  const ids = (documents ?? []).map((d: any) => d.id);
  const [{ data: chunks }, { data: tags }, { data: categories }] = await Promise.all([
    ids.length
      ? supabase
          .from("knowledge_chunks")
          .select("id, document_id, chunk_index, content, token_count, metadata, created_at")
          .in("document_id", ids)
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from("knowledge_tags")
      .select("*")
      .eq("company_id", companyId)
      .then(
        (r: any) => r,
        () => ({ data: [] }),
      ),
    supabase
      .from("knowledge_categories")
      .select("*")
      .eq("company_id", companyId)
      .then(
        (r: any) => r,
        () => ({ data: [] }),
      ),
  ]);
  return {
    documents: documents ?? [],
    chunks: chunks ?? [],
    tags: tags ?? [],
    categories: categories ?? [],
  };
}

async function snapshotFaq(supabase: any, companyId: string) {
  const { data } = await supabase.from("faqs").select("*").eq("company_id", companyId);
  return { faqs: data ?? [] };
}

async function snapshotWorkspace(supabase: any, companyId: string) {
  const [kb, faq, company, users, roles, departments, brand, templates, settings] =
    await Promise.all([
      snapshotKb(supabase, companyId),
      snapshotFaq(supabase, companyId),
      supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
      supabase.from("profiles").select("*").eq("company_id", companyId),
      supabase.from("user_roles").select("*").eq("company_id", companyId),
      supabase
        .from("departments")
        .select("*")
        .eq("company_id", companyId)
        .then(
          (r: any) => r,
          () => ({ data: [] }),
        ),
      supabase
        .from("brand_assets")
        .select("*")
        .eq("company_id", companyId)
        .then(
          (r: any) => r,
          () => ({ data: [] }),
        ),
      supabase
        .from("sop_templates")
        .select("*")
        .eq("company_id", companyId)
        .then(
          (r: any) => r,
          () => ({ data: [] }),
        ),
      supabase
        .from("company_settings")
        .select("*")
        .eq("company_id", companyId)
        .then(
          (r: any) => r,
          () => ({ data: null }),
        ),
    ]);
  return {
    kb,
    faq,
    company: company.data ?? null,
    users: users.data ?? [],
    roles: roles.data ?? [],
    departments: departments.data ?? [],
    brand_assets: brand.data ?? [],
    sop_templates: templates.data ?? [],
    settings: settings.data ?? null,
  };
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
      getCloudSupabase(context, "exports"),
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

    // Create export row in queued state.
    const { data: jobRow, error: jobErr } = await getCloudSupabase(context, "exports")
      .from("exports")
      .insert({
        company_id: companyId,
        kind: data.kind,
        mode: data.mode,
        format: data.format,
        status: "processing",
        progress: 5,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (jobErr) throw new Error(jobErr.message);
    const jobId = jobRow.id as string;

    try {
      // 1. Snapshot
      const snapshot =
        data.kind === "kb"
          ? await snapshotKb(getCloudSupabase(context, "exports"), companyId)
          : data.kind === "faq"
            ? await snapshotFaq(getCloudSupabase(context, "exports"), companyId)
            : await snapshotWorkspace(getCloudSupabase(context, "exports"), companyId);

      // 2. Build package
      const pkg = await buildPackage(data.kind, snapshot, {
        companyId,
        createdBy: context.userId,
        mode: data.mode,
      });

      // 3. Upload to storage (partitioned by company id)
      const storagePath = `${companyId}/${data.kind}/${jobId}.zip`;
      const { error: upErr } = await getCloudSupabase(context, "exports").storage
        .from(BUCKET)
        .upload(storagePath, pkg.bytes, {
          contentType: "application/zip",
          upsert: true,
        });
      if (upErr) throw upErr;

      // 4. Verify integrity (download and re-hash)
      const { data: blob, error: dlErr } = await getCloudSupabase(context, "exports").storage
        .from(BUCKET)
        .download(storagePath);
      if (dlErr) throw dlErr;
      const downloaded = new Uint8Array(await blob.arrayBuffer());
      const verifySha = createHash("sha256").update(downloaded).digest("hex");
      if (verifySha !== pkg.sha256) throw new Error("Integrity check failed: checksum mismatch");

      await getCloudSupabase(context, "exports")
        .from("exports")
        .update({
          status: "completed",
          progress: 100,
          storage_path: storagePath,
          sha256: pkg.sha256,
          bytes: pkg.bytes.byteLength,
          file_count: pkg.fileCount,
          manifest: pkg.manifest as any,
        })
        .eq("id", jobId);

      // 5. Optional deletion
      let deletedCounts: Record<string, number> = {};
      if (data.mode === "delete") {
        deletedCounts = await performDelete(getCloudSupabase(context, "exports"), data.kind, companyId);
        await getCloudSupabase(context, "exports")
          .from("exports")
          .update({
            deletion_status: "completed",
            deletion_typed: data.delete_confirmation,
            deleted_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      // 6. Audit
      await getCloudSupabase(context, "exports").rpc("audit_write", {
        p_company: companyId,
        p_user: context.userId,
        p_module: data.kind === "workspace" ? "workspace" : data.kind,
        p_action:
          data.mode === "delete"
            ? "export_and_delete"
            : data.mode === "migrate"
              ? "export_migrate"
              : "export",
        p_resource: jobId,
        p_old: null,
        p_new: {
          summary: `${data.kind} ${data.mode} export — ${pkg.fileCount} files, ${pkg.bytes.byteLength} bytes`,
          sha256: pkg.sha256,
          counts: pkg.manifest.counts ?? {},
          deleted: deletedCounts,
        },
        p_severity: data.mode === "delete" ? "warning" : "info",
        p_success: true,
        p_ip: null,
        p_ua: null,
      } as any);

      // 7. Signed URL for download
      const { data: signed } = await getCloudSupabase(context, "exports").storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 60 * 60); // 1 hour
      return {
        ok: true as const,
        job_id: jobId,
        sha256: pkg.sha256,
        bytes: pkg.bytes.byteLength,
        download_url: signed?.signedUrl ?? null,
        deleted: deletedCounts,
      };
    } catch (err) {
      await getCloudSupabase(context, "exports")
        .from("exports")
        .update({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        })
        .eq("id", jobId);
      await getCloudSupabase(context, "exports").rpc("audit_write", {
        p_company: companyId,
        p_user: context.userId,
        p_module: data.kind,
        p_action: "export_failed",
        p_resource: jobId,
        p_old: null,
        p_new: { error: err instanceof Error ? err.message : String(err) },
        p_severity: "error",
        p_success: false,
        p_ip: null,
        p_ua: null,
      } as any);
      throw err;
    }
  });

async function performDelete(supabase: any, kind: Kind, companyId: string) {
  const counts: Record<string, number> = {};
  if (kind === "kb" || kind === "workspace") {
    const { data: docs } = await supabase
      .from("knowledge_documents")
      .select("id")
      .eq("company_id", companyId);
    const ids = (docs ?? []).map((d: any) => d.id);
    counts.documents = ids.length;
    if (ids.length) {
      await supabase.from("knowledge_chunks").delete().in("document_id", ids);
      await supabase.from("knowledge_documents").delete().in("id", ids);
    }
  }
  if (kind === "faq" || kind === "workspace") {
    const { data: faqs } = await supabase.from("faqs").select("id").eq("company_id", companyId);
    counts.faqs = (faqs ?? []).length;
    await supabase.from("faqs").delete().eq("company_id", companyId);
  }
  return counts;
}

export const listExports = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data, error } = await getCloudSupabase(context, "exports")
      .from("exports")
      .select(
        "id, kind, mode, format, status, progress, sha256, bytes, file_count, deletion_status, error, created_at, completed_at, expires_at, storage_path",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { exports: data ?? [] };
  });

export const getExportDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await getCloudSupabase(context, "exports")
      .from("exports")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.storage_path) throw new Error("Export not available");
    const { data: signed, error: sigErr } = await getCloudSupabase(context, "exports").storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 60 * 60);
    if (sigErr) throw new Error(sigErr.message);
    return { url: signed?.signedUrl };
  });

/* ----------------------------------------------------------------- */
/* Hierarchy reads (thin wrappers around RPCs)                        */
/* ----------------------------------------------------------------- */

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
