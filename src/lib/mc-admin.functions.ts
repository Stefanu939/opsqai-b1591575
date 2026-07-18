import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { z } from "zod";

// ── Audit Log ─────────────────────────────────────────────────────────

const AuditFilters = z.object({
  company_id: z.string().uuid().nullable().optional(),
  module: z.string().nullable().optional(),
  severity: z.enum(["info", "warning", "critical"]).nullable().optional(),
  search: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(500).default(200),
});

export const listPlatformAuditLog = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => AuditFilters.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("mc-admin");
    let q = supabaseAdmin
      .from("audit_log")
      .select(
        "id, created_at, user_id, company_id, module, action, resource, severity, success, ip, companies(name)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.company_id) q = q.eq("company_id", data.company_id);
    if (data.module) q = q.eq("module", data.module);
    if (data.severity) q = q.eq("severity", data.severity);
    if (data.search) q = q.or(`action.ilike.%${data.search}%,resource.ilike.%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ── Platform Config (AI + Backup) ─────────────────────────────────────

export const getPlatformConfig = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("mc-admin");
    const { data, error } = await supabaseAdmin
      .from("platform_config")
      .select(
        "install_id, installer_version, eula_accepted_at, ai_provider_config, backup_config, recovery_mode, updated_at",
      )
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const AiConfigSchema = z.object({
  provider: z.enum(["openai", "azure", "ollama", "anthropic", "gateway"]),
  model: z.string().min(1).max(200),
  base_url: z.string().url().optional().nullable(),
  temperature: z.number().min(0).max(2).default(0.2),
  max_tokens: z.number().int().min(1).max(200_000).optional().nullable(),
});

export const savePlatformAiConfig = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => AiConfigSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("mc-admin");
    const { error } = await supabaseAdmin
      .from("platform_config")
      .update({ ai_provider_config: data, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Customer Profiles (CRM) ───────────────────────────────────────────

export const listCustomerProfiles = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("mc-admin");
    const { data: companies, error } = await supabaseAdmin
      .from("companies")
      .select(
        "id, name, subscription_plan, subscription_status, active, max_users, install_id, created_at",
      )
      .order("name");
    if (error) throw new Error(error.message);

    const ids = (companies ?? []).map((c) => c.id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin
          .from("customer_profiles")
          .select(
            "company_id, account_manager_id, contract_status, renewal_date, onboarding_pct, updated_at",
          )
          .in("company_id", ids)
      : { data: [] as Array<{
          company_id: string;
          account_manager_id: string | null;
          contract_status: string | null;
          renewal_date: string | null;
          onboarding_pct: number | null;
          updated_at: string | null;
        }> };

    // Counts of active users per company
    const { data: userRoleRows } = ids.length
      ? await supabaseAdmin
          .from("user_roles")
          .select("company_id")
          .in("company_id", ids)
      : { data: [] as Array<{ company_id: string | null }> };
    const userCounts = new Map<string, number>();
    for (const r of userRoleRows ?? []) {
      if (!r.company_id) continue;
      userCounts.set(r.company_id, (userCounts.get(r.company_id) ?? 0) + 1);
    }

    // Install-kind licenses per install_id
    const installIds = (companies ?? [])
      .map((c) => c.install_id)
      .filter((v): v is string => !!v);
    const { data: licenses } = installIds.length
      ? await supabaseAdmin
          .from("licenses")
          .select(
            "install_id, kind, seats, expires_at, maintenance_expires_at, revoked, suspended, issued_at",
          )
          .in("install_id", installIds)
          .eq("kind", "install")
      : { data: [] as Array<{
          install_id: string;
          kind: string;
          seats: number | null;
          expires_at: string | null;
          maintenance_expires_at: string | null;
          revoked: boolean | null;
          suspended: boolean | null;
          issued_at: string | null;
        }> };
    const licByInstall = new Map((licenses ?? []).map((l) => [l.install_id, l]));

    const byId = new Map((profiles ?? []).map((p) => [p.company_id, p]));
    return (companies ?? []).map((c) => ({
      ...c,
      user_count: userCounts.get(c.id) ?? 0,
      profile: byId.get(c.id) ?? null,
      license: c.install_id ? licByInstall.get(c.install_id) ?? null : null,
    }));
  });

const UpsertContractSchema = z.object({
  company_id: z.string().uuid(),
  contract_status: z.enum(["prospect", "trial", "active", "renewal", "churned"]).nullable().optional(),
  renewal_date: z.string().date().nullable().optional(),
  onboarding_pct: z.number().int().min(0).max(100).nullable().optional(),
});

export const upsertCustomerContract = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => UpsertContractSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("mc-admin");
    const patch: {
      company_id: string;
      updated_at: string;
      contract_status?: string;
      renewal_date?: string;
      onboarding_pct?: number;
    } = {
      company_id: data.company_id,
      updated_at: new Date().toISOString(),
    };
    if (data.contract_status) patch.contract_status = data.contract_status;
    if (data.renewal_date) patch.renewal_date = data.renewal_date;
    if (data.onboarding_pct != null) patch.onboarding_pct = data.onboarding_pct;
    const { error } = await supabaseAdmin
      .from("customer_profiles")
      .upsert(patch, { onConflict: "company_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Portal snapshot (what customers see) ──────────────────────────────

export const getPortalSnapshot = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("mc-admin");
    const [releasesRes, licensesRes, ticketsRes] = await Promise.all([
      supabaseAdmin
        .from("license_releases")
        .select("version, channel, is_current, published_at")
        .order("published_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("licenses")
        .select("install_id, company_name, tier, revoked")
        .eq("kind", "install"),
      supabaseAdmin
        .from("support_conversations")
        .select("id, status")
        .in("status", ["open", "pending"]),
    ]);
    return {
      releases: releasesRes.data ?? [],
      activeInstalls: (licensesRes.data ?? []).filter((l) => !l.revoked).length,
      totalInstalls: (licensesRes.data ?? []).length,
      openTickets: (ticketsRes.data ?? []).length,
    };
  });
