// Pure zod schema shared between the self-hosted heartbeat sender and the
// public cloud ingestion endpoint. No server-only imports here.
import { z } from "zod";

export const ReportedStatusSchema = z.enum(["running", "degraded", "updating", "maintenance"]);
export const LicenseStatusSchema = z.enum([
  "licensed",
  "expired",
  "revoked",
  "suspended",
  "missing",
  "invalid",
]);

/**
 * Aggregate-only usage metrics. Numbers, never content: no titles, names,
 * e-mails or free text may appear here. The schema is strict — an unknown
 * key makes the whole payload invalid, which is the point.
 */
export const UsageMetricsSchema = z
  .object({
    window_days: z.number().int().min(1).max(400),
    users_total: z.number().min(0),
    users_active_7d: z.number().min(0),
    users_active_30d: z.number().min(0),
    sessions_30d: z.number().min(0),
    session_minutes_30d: z.number().min(0),
    ai_questions_30d: z.number().min(0),
    ai_answers_with_source_30d: z.number().min(0),
    ai_avg_confidence: z.number().min(0).max(1),
    documents_total: z.number().min(0),
    documents_added_30d: z.number().min(0),
    faqs_total: z.number().min(0),
    knowledge_gaps_open: z.number().min(0),
    approvals_30d: z.number().min(0),
    expiry_alerts_open: z.number().min(0),
    expiry_alerts_resolved_30d: z.number().min(0),
    incidents_open: z.number().min(0),
    incidents_closed_30d: z.number().min(0),
    academy_assigned_30d: z.number().min(0),
    academy_completed_30d: z.number().min(0),
    errors_30d: z.number().min(0),
    last_backup_days_ago: z.number().min(0).nullable(),
  })
  .strict();

export type UsageMetricsPayload = z.infer<typeof UsageMetricsSchema>;

export const HeartbeatPayloadSchema = z.object({

  installation_id: z.string().min(3).max(64),
  /** Signed Ed25519 install-license JWT; proves the caller owns the license. */
  signed_token: z.string().min(10).max(8000),
  organization_name: z.string().max(200).optional(),
  country: z.string().max(4).optional(),
  primary_language: z.string().max(10).optional(),
  app_version: z.string().max(32).optional(),
  license_status: LicenseStatusSchema.optional(),
  enabled_modules: z.array(z.string().max(64)).max(64).optional().default([]),
  status: ReportedStatusSchema.optional().default("running"),
  last_maintenance_at: z.string().datetime().nullable().optional(),
  next_maintenance_at: z.string().datetime().nullable().optional(),
  /** Aggregate-only usage numbers; absent when the customer opted out. */
  usage: UsageMetricsSchema.nullable().optional(),
  timestamp: z.string().datetime(),
});


export type HeartbeatPayload = z.infer<typeof HeartbeatPayloadSchema>;
