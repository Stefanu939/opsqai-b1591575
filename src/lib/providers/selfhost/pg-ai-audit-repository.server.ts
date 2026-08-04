import type { Pool } from "pg";
import type { IAiAuditRepository, JsonLike } from "@/lib/providers/interfaces";

export function createPgAiAuditRepository({ pool }: { pool: Pool }): IAiAuditRepository {
  return {
    async list(companyId, limit) {
      const { rows } = await pool.query<{
        id: string; score: number; maturity: string | null; passed: number; warnings: number;
        critical: number; summary: JsonLike; created_at: Date;
      }>(`SELECT id, score, maturity, passed, warnings, critical, summary, created_at
            FROM public.ai_audits WHERE company_id=$1 ORDER BY created_at DESC LIMIT $2`,
        [companyId, limit]);
      return rows.map((r) => ({ ...r, createdAt: r.created_at.toISOString() }));
    },
    async create(input) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.ai_audits
           (company_id, requested_by, score, maturity, summary, passed, warnings, critical,
            model, latency_ms, input_hash, output_hash, token_usage, retrieval_chunk_ids, status, error_code)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16) RETURNING id`,
        [input.companyId,input.requestedBy,input.score,input.maturity,JSON.stringify(input.summary),
         input.passed,input.warnings,input.critical,input.model ?? null,input.latencyMs ?? null,
         input.inputHash ?? null,input.outputHash ?? null,
         input.tokenUsage == null ? null : JSON.stringify(input.tokenUsage),input.retrievalChunkIds ?? [],
         input.status ?? "completed",input.errorCode ?? null],
      );
      return rows[0];
    },
  };
}