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
  timestamp: z.string().datetime(),
});

export type HeartbeatPayload = z.infer<typeof HeartbeatPayloadSchema>;
