// First-Run Wizard server functions (Phase 5).
//
// These endpoints are PUBLIC — no auth middleware. Authorization is the
// first-run gate (see `first-run.server.ts`): the install must have zero
// platform admins AND `platform_config.setup_completed_at` must be null.
// Every state-changing handler re-runs `assertFirstRunOpen()` so a direct
// RPC POST cannot bypass the client-side redirect.
//
// Secrets (AI provider API keys, SMTP password) are written to
// `secrets.env` on the customer's data volume with mode 0600; the container
// entrypoint sources it. The database only stores non-secret identifiers.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertFirstRunOpen, evaluateFirstRunGate, writeSecretsEnv } from "@/lib/first-run.server";
import { SETUP_STEPS, type SetupStepId } from "@/lib/setup-steps";
import { runDoctorReport } from "@/lib/doctor.server";

const VALID_STEP_IDS = new Set<string>(SETUP_STEPS.map((s) => s.id));

async function markStep(stepId: SetupStepId): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cfg } = await supabaseAdmin
    .from("platform_config")
    .select("setup_progress")
    .eq("id", true)
    .maybeSingle();
  const current = new Set<string>(
    Array.isArray(cfg?.setup_progress) ? (cfg!.setup_progress as string[]) : [],
  );
  current.add(stepId);
  await supabaseAdmin
    .from("platform_config")
    .update({ setup_progress: Array.from(current) })
    .eq("id", true);
}

/** Public: read the gate state. Safe to call from a public loader. */
export const getFirstRunGate = createServerFn({ method: "GET" }).handler(async () => {
  return evaluateFirstRunGate();
});

/** Public: current wizard progress (non-secret step IDs only). */
export const getFirstRunProgress = createServerFn({ method: "GET" }).handler(async () => {
  await assertFirstRunOpen();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("platform_config")
    .select(
      "install_id, installer_version, setup_progress, eula_accepted_at, ai_provider_config, backup_config",
    )
    .eq("id", true)
    .maybeSingle();
  return {
    install_id: data?.install_id ?? null,
    installer_version: data?.installer_version ?? null,
    setup_progress: Array.isArray(data?.setup_progress) ? (data!.setup_progress as string[]) : [],
    eula_accepted_at: data?.eula_accepted_at ?? null,
    ai_provider_config: data?.ai_provider_config ?? null,
    backup_config: data?.backup_config ?? null,
  };
});

const AcceptEulaInput = z.object({ accepted: z.literal(true) });

export const acceptEula = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AcceptEulaInput.parse(d))
  .handler(async () => {
    await assertFirstRunOpen();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("platform_config")
      .update({ eula_accepted_at: new Date().toISOString() })
      .eq("id", true);
    await markStep("eula_accepted");
    return { ok: true };
  });

const ImportLicenseInput = z.object({ token: z.string().min(20).max(20_000) });

export const firstRunImportLicense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ImportLicenseInput.parse(d))
  .handler(async ({ data }) => {
    await assertFirstRunOpen();
    const { importLicenseToken } = await import("@/lib/license-import.server");
    const result = await importLicenseToken(data.token);
    if (result.ok) await markStep("license_imported");
    return result;
  });

export const firstRunTestStorage = createServerFn({ method: "POST" }).handler(async () => {
  await assertFirstRunOpen();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const bucket = process.env.OPSQAI_UPLOADS_BUCKET || "uploads";
  const probeKey = `.first-run-probe-${Date.now()}.txt`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(probeKey, new Blob(["ok"]), { upsert: true });
  if (upErr) return { ok: false as const, error: upErr.message };
  await supabaseAdmin.storage
    .from(bucket)
    .remove([probeKey])
    .catch(() => {});
  await markStep("storage_ok");
  return { ok: true as const, bucket };
});

const AiProviderInput = z.object({
  provider: z.enum(["lovable", "azure", "openai-compatible", "ollama"]),
  endpoint: z.string().url().optional().or(z.literal("")),
  model: z.string().max(128).optional().or(z.literal("")),
  api_key: z.string().max(512).optional().or(z.literal("")),
});

export const firstRunSetAiProvider = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AiProviderInput.parse(d))
  .handler(async ({ data }) => {
    await assertFirstRunOpen();

    // Persist only NON-SECRET identifiers to the DB.
    const publicConfig = {
      provider: data.provider,
      endpoint: data.endpoint || null,
      model: data.model || null,
      configured_at: new Date().toISOString(),
    };

    // Route secrets to `secrets.env` (chmod 600, sourced by entrypoint.sh).
    if (data.api_key) {
      const envKey =
        data.provider === "azure"
          ? "AZURE_OPENAI_API_KEY"
          : data.provider === "openai-compatible"
            ? "OPENAI_COMPATIBLE_API_KEY"
            : data.provider === "ollama"
              ? "OLLAMA_API_KEY"
              : "LOVABLE_API_KEY";
      await writeSecretsEnv({ [envKey]: data.api_key, AI_PROVIDER: data.provider });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("platform_config")
      .update({ ai_provider_config: publicConfig })
      .eq("id", true);
    await markStep("ai_configured");
    return { ok: true, requires_restart: !!data.api_key };
  });

const SmtpInput = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  from_email: z.string().email(),
  from_name: z.string().max(128).optional().or(z.literal("")),
  username: z.string().max(255).optional().or(z.literal("")),
  password: z.string().max(512).optional().or(z.literal("")),
  test_recipient: z.string().email().optional().or(z.literal("")),
});

export const firstRunTestSmtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SmtpInput.parse(d))
  .handler(async ({ data }) => {
    await assertFirstRunOpen();

    // All SMTP config lives in secrets.env (the file is 0600 anyway, and
    // grouping host/port/creds keeps the wizard's persistence surface
    // small — no schema migration needed for SMTP host/port fields).
    await writeSecretsEnv({
      SMTP_HOST: data.host,
      SMTP_PORT: String(data.port),
      SMTP_FROM_EMAIL: data.from_email,
      SMTP_FROM_NAME: data.from_name || "",
      SMTP_USERNAME: data.username || "",
      ...(data.password ? { SMTP_PASSWORD: data.password } : {}),
    });

    await markStep("smtp_configured");
    return { ok: true, requires_restart: true };
  });

const SsoInput = z.object({
  skip: z.boolean().default(false),
  provider: z.enum(["saml", "oidc"]).optional(),
  metadata_url: z.string().url().optional().or(z.literal("")),
});

export const firstRunConfigureSso = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SsoInput.parse(d))
  .handler(async ({ data }) => {
    await assertFirstRunOpen();
    // Full SSO wiring lives at the Management Center post-install; this step
    // only records intent so the wizard can be marked complete.
    await markStep("sso_configured");
    return { ok: true, skipped: data.skip };
  });

const BackupInput = z.object({
  target: z.enum(["local", "s3", "azure", "nas"]),
  endpoint: z.string().max(512).optional().or(z.literal("")),
  bucket: z.string().max(255).optional().or(z.literal("")),
  access_key: z.string().max(512).optional().or(z.literal("")),
  secret_key: z.string().max(512).optional().or(z.literal("")),
});

export const firstRunSetBackupTarget = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => BackupInput.parse(d))
  .handler(async ({ data }) => {
    await assertFirstRunOpen();

    const publicConfig = {
      target: data.target,
      endpoint: data.endpoint || null,
      bucket: data.bucket || null,
      configured_at: new Date().toISOString(),
    };

    if (data.access_key || data.secret_key) {
      await writeSecretsEnv({
        BACKUP_ACCESS_KEY: data.access_key || "",
        BACKUP_SECRET_KEY: data.secret_key || "",
      });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("platform_config")
      .update({ backup_config: publicConfig })
      .eq("id", true);
    await markStep("backup_configured");
    return { ok: true, requires_restart: !!(data.access_key || data.secret_key) };
  });

export const firstRunRunDoctor = createServerFn({ method: "POST" }).handler(async () => {
  await assertFirstRunOpen();
  return runDoctorReport();
});

const CreateAdminInput = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(200),
  full_name: z.string().min(1).max(200),
});

export const firstRunCreateAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateAdminInput.parse(d))
  .handler(async ({ data }) => {
    // Cheap pre-check for the common case; the DB advisory lock inside
    // `first_run_bootstrap_admin` is the authoritative race guard.
    await assertFirstRunOpen();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created?.user) {
      throw new Error(`Failed to create admin user: ${createErr?.message ?? "unknown error"}`);
    }

    const userId = created.user.id;

    const { data: promoted, error: bootErr } = await supabaseAdmin.rpc(
      "first_run_bootstrap_admin",
      { _user_id: userId },
    );

    if (bootErr || promoted !== true) {
      // Race lost (or DB error). Roll back the just-created auth user so the
      // orphan cannot sign in without any role.
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      if (bootErr) throw new Error(`Bootstrap failed: ${bootErr.message}`);
      throw new Error("Forbidden: setup already completed by another request");
    }

    // Best-effort profile row if the project uses one.
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: data.full_name, email: data.email } as never, {
        onConflict: "id",
      })
      .then(
        () => undefined,
        () => undefined,
      );

    await markStep("admin_created");
    return { ok: true, user_id: userId, email: data.email };
  });
