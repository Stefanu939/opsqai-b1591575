// Self-Hosted IExportRepository — backed by public.exports plus the
// single-tenant knowledge/faq/user tables. Self-Hosted has no
// public.companies / brand_assets / sop_templates / company_settings
// tables, so those snapshot slices degrade to empty/synthetic values.

import type { Pool } from "pg";
import type {
  ExportAuditInput,
  ExportFaqSnapshot,
  ExportJobCompleteInput,
  ExportJobCreateInput,
  ExportJobRow,
  ExportKbSnapshot,
  ExportWorkspaceSnapshot,
  IExportRepository,
} from "@/lib/providers/interfaces";

export interface PgExportRepositoryDeps {
  pool: Pool;
  tenantCompanyId: string;
  tenantName: string;
}

export function createPgExportRepository(deps: PgExportRepositoryDeps): IExportRepository {
  const { pool, tenantCompanyId, tenantName } = deps;

  const repo: IExportRepository = {
    async createJob(input: ExportJobCreateInput) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.exports (company_id, kind, mode, format, status, progress, created_by)
         VALUES ($1,$2,$3,$4,'processing',5,$5)
         RETURNING id`,
        [input.companyId, input.kind, input.mode, input.format, input.createdBy],
      );
      return { id: rows[0].id };
    },

    async markCompleted(id, patch: ExportJobCompleteInput) {
      await pool.query(
        `UPDATE public.exports
            SET status = 'completed',
                progress = 100,
                storage_path = $2,
                sha256 = $3,
                bytes = $4,
                file_count = $5,
                manifest = $6::jsonb,
                completed_at = now()
          WHERE id = $1`,
        [id, patch.storagePath, patch.sha256, patch.bytes, patch.fileCount, JSON.stringify(patch.manifest)],
      );
    },

    async markFailed(id, error) {
      await pool.query(
        `UPDATE public.exports SET status = 'failed', error = $2 WHERE id = $1`,
        [id, error],
      );
    },

    async markDeleted(id, deletionTyped) {
      await pool.query(
        `UPDATE public.exports
            SET deletion_status = 'completed',
                deletion_typed = $2,
                deleted_at = now()
          WHERE id = $1`,
        [id, deletionTyped],
      );
    },

    async listJobs(companyId, limit): Promise<ExportJobRow[]> {
      const { rows } = await pool.query<ExportJobRow>(
        `SELECT id, kind, mode, format, status, progress, sha256, bytes, file_count,
                deletion_status, error, created_at, completed_at, expires_at, storage_path
           FROM public.exports
          WHERE company_id = $1
          ORDER BY created_at DESC
          LIMIT $2`,
        [companyId, limit],
      );
      return rows;
    },

    async getStoragePath(id) {
      const { rows } = await pool.query<{ storage_path: string | null }>(
        `SELECT storage_path FROM public.exports WHERE id = $1`,
        [id],
      );
      return rows[0]?.storage_path ?? null;
    },

    async snapshotKb(companyId): Promise<ExportKbSnapshot> {
      const { rows: documents } = await pool.query(
        `SELECT * FROM public.knowledge_documents WHERE company_id = $1`,
        [companyId],
      );
      const ids = documents.map((d) => d.id as string);
      const { rows: chunks } = ids.length
        ? await pool.query(
            `SELECT id, document_id, chunk_index, content, token_count, created_at
               FROM public.document_chunks
              WHERE document_id = ANY($1::uuid[])`,
            [ids],
          )
        : { rows: [] as Record<string, unknown>[] };
      return { documents, chunks, tags: [], categories: [] };
    },

    async snapshotFaq(companyId): Promise<ExportFaqSnapshot> {
      const { rows } = await pool.query(
        `SELECT * FROM public.faqs WHERE company_id = $1`,
        [companyId],
      );
      return { faqs: rows };
    },

    async snapshotWorkspace(companyId): Promise<ExportWorkspaceSnapshot> {
      const [kb, faq, users, roles, departments] = await Promise.all([
        repo.snapshotKb(companyId),
        repo.snapshotFaq(companyId),
        pool.query(
          `SELECT id, email, display_name, first_name, last_name, full_name, phone, position,
                  department, department_id, is_active, language_pref, created_at, updated_at
             FROM public.users WHERE company_id = $1`,
          [companyId],
        ),
        pool.query(
          `SELECT ur.user_id, ur.role FROM public.user_roles ur
             JOIN public.users u ON u.id = ur.user_id
            WHERE u.company_id = $1`,
          [companyId],
        ),
        pool.query(`SELECT * FROM public.departments WHERE company_id = $1`, [companyId]),
      ]);
      return {
        kb,
        faq,
        company: { id: tenantCompanyId, name: tenantName, is_system: true },
        users: users.rows,
        roles: roles.rows,
        departments: departments.rows,
        brand_assets: [],
        sop_templates: [],
        settings: null,
      };
    },

    async deleteKbData(companyId) {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM public.knowledge_documents WHERE company_id = $1`,
        [companyId],
      );
      const ids = rows.map((r) => r.id);
      if (ids.length) {
        await pool.query(`DELETE FROM public.document_chunks WHERE document_id = ANY($1::uuid[])`, [ids]);
        await pool.query(`DELETE FROM public.knowledge_documents WHERE id = ANY($1::uuid[])`, [ids]);
      }
      return ids.length;
    },

    async deleteFaqData(companyId) {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM public.faqs WHERE company_id = $1`,
        [companyId],
      );
      await pool.query(`DELETE FROM public.faqs WHERE company_id = $1`, [companyId]);
      return rows.length;
    },

    async writeAudit(input: ExportAuditInput) {
      await pool.query(
        `INSERT INTO public.audit_log (actor_id, action, target, detail)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
          input.userId,
          input.action,
          input.resource,
          JSON.stringify({
            module: input.module,
            severity: input.severity,
            success: input.success,
            company_id: input.companyId,
            ...(typeof input.payload === "object" && input.payload !== null ? input.payload : { payload: input.payload }),
          }),
        ],
      );
    },
  };

  return repo;
}

export const pgExportRepositoryFactory =
  (deps: PgExportRepositoryDeps) => (_dataCtx: unknown) => createPgExportRepository(deps);
