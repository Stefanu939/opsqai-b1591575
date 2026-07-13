// Server functions backing the Setup Wizard (Phase 5).
//
// All functions are platform-admin gated. The wizard NEVER stores secrets —
// only step IDs from the frozen `SETUP_STEPS` catalog are persisted, plus
// the install_id and installer_version reported by the running install.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin } from "@/lib/authorization";
import { assertNoBlacklistedSecrets } from "@/lib/mc-secrets-blacklist";
import { SETUP_STEPS, computeSetupComplete, type SetupStepId } from "@/lib/setup-steps";
import { runDoctorReport } from "@/lib/doctor.server";

const VALID_STEP_IDS = new Set<string>(SETUP_STEPS.map((s) => s.id));

export const getSetupState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data, error } = await context.supabase
      .from("platform_config")
      .select("install_id, installer_version, setup_progress, setup_completed_at, updated_at")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? {
        install_id: null,
        installer_version: null,
        setup_progress: [] as string[],
        setup_completed_at: null,
        updated_at: null,
      }
    );
  });

const MarkStepInput = z.object({
  step_id: z.string().refine((s): s is SetupStepId => VALID_STEP_IDS.has(s), {
    message: "unknown setup step id",
  }),
  done: z.boolean().default(true),
});

export const markSetupStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MarkStepInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    // Extra belt-and-braces: reject anything that looks like a secret being
    // smuggled through this endpoint.
    assertNoBlacklistedSecrets(data, "markSetupStep input");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin
      .from("platform_config")
      .select("setup_progress, setup_completed_at")
      .eq("id", true)
      .maybeSingle();

    const current = new Set<string>(
      Array.isArray(cfg?.setup_progress) ? (cfg!.setup_progress as string[]) : [],
    );
    if (data.done) current.add(data.step_id);
    else current.delete(data.step_id);

    const nextProgress = Array.from(current);
    const mode: "cloud" | "selfhost" =
      process.env.OPSQAI_MODE === "selfhost" ? "selfhost" : "cloud";
    const completed = computeSetupComplete(nextProgress, mode);

    const { error } = await supabaseAdmin
      .from("platform_config")
      .update({
        setup_progress: nextProgress,
        setup_completed_at:
          completed && !cfg?.setup_completed_at
            ? new Date().toISOString()
            : (cfg?.setup_completed_at ?? null),
      })
      .eq("id", true);
    if (error) throw new Error(error.message);

    return { ok: true, setup_progress: nextProgress, completed };
  });

const RegisterInstallInput = z.object({
  install_id: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]{2,}$/, "lowercase, digits, dashes"),
  installer_version: z.string().max(32).optional(),
});

/**
 * One-shot registration performed by the installer / entrypoint:
 * pins the install_id and installer_version into `platform_config` so the
 * wizard and doctor can display them. Never overwrites once set unless the
 * install_id matches — protects against accidental cross-install mixups.
 */
export const registerInstall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RegisterInstallInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    assertNoBlacklistedSecrets(data, "registerInstall input");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin
      .from("platform_config")
      .select("install_id")
      .eq("id", true)
      .maybeSingle();

    if (cfg?.install_id && cfg.install_id !== data.install_id) {
      throw new Error(
        `platform_config already pinned to install_id=${cfg.install_id}; refusing to overwrite`,
      );
    }

    const { error } = await supabaseAdmin
      .from("platform_config")
      .update({
        install_id: data.install_id,
        installer_version: data.installer_version ?? null,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    return runDoctorReport();
  });
