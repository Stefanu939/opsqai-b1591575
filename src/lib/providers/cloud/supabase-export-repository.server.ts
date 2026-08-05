// Cloud IExportRepository — backed by Supabase (public.exports + the
// existing knowledge/faq/workspace tables). Moved verbatim from
// exports.functions.ts so Self-Hosted can supply its own pg-backed
// implementation without ever importing @/integrations/supabase/*.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<Database> | any;

export function createSupabaseExportRepository(client: AnyClient): IExportRepository {
  return {
    async createJob(input: ExportJobCreateInput) {
      const { data, error } = await client
        .from("exports")
        .insert({
          company_id: input.companyId,
          kind: input.kind,
          mode: input.mode,
          format: input.format,
          status: "processing",
          progress: 5,
          created_by: input.createdBy,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id as string };
    },

    async markCompleted(id: string, patch: ExportJobCompleteInput) {
      const { error } = await client
        .from("exports")
        .update({
          status: "completed",
          progress: 100,
          storage_path: patch.storagePath,
          sha256: patch.sha256,
          bytes: patch.bytes,
          file_count: patch.fileCount,
          manifest: patch.manifest,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async markFailed(id: string, error: string) {
      const { error: dbErr } = await client
        .from("exports")
        .update({ status: "failed", error })
        .eq("id", id);
      if (dbErr) throw new Error(dbErr.message);
    },

    async markDeleted(id: string, deletionTyped: string | null) {
      const { error } = await client
        .from("exports")
        .update({
          deletion_status: "completed",
          deletion_typed: deletionTyped,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async listJobs(companyId: string, limit: number): Promise<ExportJobRow[]> {
      const { data, error } = await client
        .from("exports")
        .select(
          "id, kind, mode, format, status, progress, sha256, bytes, file_count, deletion_status, error, created_at, completed_at, expires_at, storage_path",
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as ExportJobRow[];
    },

    async getStoragePath(id: string) {
      const { data, error } = await client
        .from("exports")
        .select("storage_path")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.storage_path ?? null;
    },

    async snapshotKb(companyId: string): Promise<ExportKbSnapshot> {
      const { data: documents } = await client
        .from("knowledge_documents")
        .select("*")
        .eq("company_id", companyId);
      const ids = (documents ?? []).map((d: { id: string }) => d.id);
      const [{ data: chunks }, { data: tags }, { data: categories }] = await Promise.all([
        ids.length
          ? client
              .from("knowledge_chunks")
              .select("id, document_id, chunk_index, content, token_count, metadata, created_at")
              .in("document_id", ids)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : Promise.resolve({ data: [] as any[] }),
        client
          .from("knowledge_tags")
          .select("*")
          .eq("company_id", companyId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((r: any) => r, () => ({ data: [] })),
        client
          .from("knowledge_categories")
          .select("*")
          .eq("company_id", companyId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((r: any) => r, () => ({ data: [] })),
      ]);
      return {
        documents: documents ?? [],
        chunks: chunks ?? [],
        tags: tags ?? [],
        categories: categories ?? [],
      };
    },

    async snapshotFaq(companyId: string): Promise<ExportFaqSnapshot> {
      const { data } = await client.from("faqs").select("*").eq("company_id", companyId);
      return { faqs: data ?? [] };
    },

    async snapshotWorkspace(companyId: string): Promise<ExportWorkspaceSnapshot> {
      const [kb, faq, company, users, roles, departments, brand, templates, settings] =
        await Promise.all([
          this.snapshotKb(companyId),
          this.snapshotFaq(companyId),
          client.from("companies").select("*").eq("id", companyId).maybeSingle(),
          client.from("profiles").select("*").eq("company_id", companyId),
          client.from("user_roles").select("*").eq("company_id", companyId),
          client
            .from("departments")
            .select("*")
            .eq("company_id", companyId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((r: any) => r, () => ({ data: [] })),
          client
            .from("brand_assets")
            .select("*")
            .eq("company_id", companyId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((r: any) => r, () => ({ data: [] })),
          client
            .from("sop_templates")
            .select("*")
            .eq("company_id", companyId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((r: any) => r, () => ({ data: [] })),
          client
            .from("company_settings")
            .select("*")
            .eq("company_id", companyId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((r: any) => r, () => ({ data: null })),
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
    },

    async deleteKbData(companyId: string): Promise<number> {
      const { data: docs } = await client
        .from("knowledge_documents")
        .select("id")
        .eq("company_id", companyId);
      const ids = (docs ?? []).map((d: { id: string }) => d.id);
      if (ids.length) {
        await client.from("knowledge_chunks").delete().in("document_id", ids);
        await client.from("knowledge_documents").delete().in("id", ids);
      }
      return ids.length;
    },

    async deleteFaqData(companyId: string): Promise<number> {
      const { data: faqs } = await client.from("faqs").select("id").eq("company_id", companyId);
      await client.from("faqs").delete().eq("company_id", companyId);
      return (faqs ?? []).length;
    },

    async writeAudit(input: ExportAuditInput) {
      await client.rpc("audit_write", {
        p_company: input.companyId,
        p_user: input.userId,
        p_module: input.module,
        p_action: input.action,
        p_resource: input.resource,
        p_old: null,
        p_new: input.payload,
        p_severity: input.severity,
        p_success: input.success,
        p_ip: null,
        p_ua: null,
      });
    },
  };
}

export const supabaseExportRepositoryFactory =
  () => (dataCtx: unknown) => createSupabaseExportRepository(dataCtx as AnyClient);
