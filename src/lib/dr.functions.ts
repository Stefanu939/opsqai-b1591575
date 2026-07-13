// Phase 5.5 — Disaster Recovery server functions.
//
// Split across two roles:
//   * MC-side:      issueBootstrapToken, listBootstrapTokens
//   * Self-hosted:  generateBreakGlass, redeemBreakGlass,
//                   redeemBootstrapToken, exitRecoveryMode, getRecoveryState,
//                   listDrScenarios
//
// All functions are platform-admin gated and enforce the MC secrets
// blacklist on their inputs.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin } from "@/lib/authorization";
import { assertNoBlacklistedSecrets } from "@/lib/mc-secrets-blacklist";
import { DR_SCENARIOS } from "@/lib/dr-scenarios";

// ─── Self-hosted: recovery state ────────────────────────────────────────

export const getRecoveryState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data, error } = await context.supabase
      .from("platform_config")
      .select(
        "install_id, break_glass_hash, break_glass_created_at, break_glass_used_at, recovery_mode, recovery_mode_since, recovery_mode_reason",
      )
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      install_id: data?.install_id ?? null,
      break_glass_generated: Boolean(data?.break_glass_hash),
      break_glass_created_at: data?.break_glass_created_at ?? null,
      break_glass_used_at: data?.break_glass_used_at ?? null,
      recovery_mode: Boolean(data?.recovery_mode),
      recovery_mode_since: data?.recovery_mode_since ?? null,
      recovery_mode_reason: data?.recovery_mode_reason ?? null,
    };
  });

// ─── Self-hosted: break-glass ───────────────────────────────────────────

const RegenBreakGlassInput = z.object({ replace_existing: z.boolean().default(false) });

/**
 * One-shot: generate a fresh break-glass secret. Refuses to overwrite an
 * existing one unless replace_existing=true (and the caller has re-confirmed).
 * Returns the plaintext EXACTLY ONCE — the hash is what persists.
 */
export const generateBreakGlass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RegenBreakGlassInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateBreakGlassSecret } = await import("@/lib/break-glass.server");

    const { data: cfg } = await supabaseAdmin
      .from("platform_config")
      .select("break_glass_hash")
      .eq("id", true)
      .maybeSingle();
    if (cfg?.break_glass_hash && !data.replace_existing) {
      throw new Error("break-glass secret already exists — pass replace_existing=true to rotate");
    }

    const { plaintext, hash } = generateBreakGlassSecret();
    const { error } = await supabaseAdmin
      .from("platform_config")
      .update({
        break_glass_hash: hash,
        break_glass_created_at: new Date().toISOString(),
        break_glass_used_at: null,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { plaintext, rotated: Boolean(cfg?.break_glass_hash) };
  });

const RedeemBreakGlassInput = z.object({
  secret: z.string().min(8).max(128),
  reason: z.string().max(500).optional(),
});

export const redeemBreakGlass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RedeemBreakGlassInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    // The secret itself isn't an *infrastructure* secret in the blacklist
    // sense — it's a local one-shot recovery token — but reason field is
    // still blacklist-scanned.
    assertNoBlacklistedSecrets({ reason: data.reason }, "redeemBreakGlass input");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyBreakGlassSecret } = await import("@/lib/break-glass.server");

    const { data: cfg } = await supabaseAdmin
      .from("platform_config")
      .select("break_glass_hash, break_glass_used_at")
      .eq("id", true)
      .maybeSingle();
    if (!verifyBreakGlassSecret(data.secret, cfg?.break_glass_hash ?? null)) {
      return { ok: false as const, reason: "invalid_secret" };
    }
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("platform_config")
      .update({
        recovery_mode: true,
        recovery_mode_since: nowIso,
        recovery_mode_reason: data.reason ?? "break_glass",
        break_glass_used_at: nowIso,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true as const, entered_at: nowIso };
  });

// ─── MC-side: issue Bootstrap Recovery Token ────────────────────────────

const IssueBootstrapInput = z.object({
  install_id: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]{2,}$/),
  ttl_hours: z.number().int().min(1).max(168).default(24),
  reason: z.string().max(500).optional(),
});

export const issueBootstrapToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IssueBootstrapInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    assertNoBlacklistedSecrets(data, "issueBootstrapToken input");

    const { signBootstrapToken } = await import("@/lib/dr-tokens.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { token, payload } = await signBootstrapToken({
      install_id: data.install_id,
      ttl_seconds: data.ttl_hours * 3600,
      reason: data.reason ?? null,
    });

    const { error } = await supabaseAdmin.from("dr_bootstrap_tokens").insert({
      install_id: data.install_id,
      key_id: payload.key_id,
      nonce: payload.nonce,
      issued_by: context.userId,
      expires_at: new Date(payload.expires_at * 1000).toISOString(),
      reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);

    return { token, payload };
  });

const ListBootstrapInput = z.object({ install_id: z.string().min(3).max(64) });

export const listBootstrapTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListBootstrapInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("dr_bootstrap_tokens")
      .select("id, install_id, key_id, nonce, issued_at, expires_at, redeemed_at, reason")
      .eq("install_id", data.install_id)
      .order("issued_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ─── Self-hosted: redeem Bootstrap Recovery Token ───────────────────────

const RedeemBootstrapInput = z.object({
  token: z.string().min(20).max(4096),
  reason: z.string().max(500).optional(),
});

export const redeemBootstrapToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RedeemBootstrapInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    assertNoBlacklistedSecrets({ reason: data.reason }, "redeemBootstrapToken input");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyBootstrapToken, peekBootstrapKeyId } = await import("@/lib/dr-tokens.server");

    const { data: cfg } = await supabaseAdmin
      .from("platform_config")
      .select("install_id")
      .eq("id", true)
      .maybeSingle();
    if (!cfg?.install_id) throw new Error("install_id not registered — run the setup wizard first");

    const keyId = peekBootstrapKeyId(data.token);
    if (!keyId) return { ok: false as const, reason: "malformed" };

    const { data: keyRow } = await supabaseAdmin
      .from("license_signing_keys")
      .select("public_key_pem")
      .eq("key_id", keyId)
      .maybeSingle();
    if (!keyRow?.public_key_pem) return { ok: false as const, reason: "unknown_key_id" };

    const result = verifyBootstrapToken(data.token, keyRow.public_key_pem, {
      expectedInstallId: cfg.install_id,
    });
    if (!result.ok) return { ok: false as const, reason: result.reason };

    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("platform_config")
      .update({
        recovery_mode: true,
        recovery_mode_since: nowIso,
        recovery_mode_reason: data.reason ?? "bootstrap_token",
      })
      .eq("id", true);
    if (error) throw new Error(error.message);

    // Best-effort mirror to audit table if it exists locally (MC-side).
    await supabaseAdmin
      .from("dr_bootstrap_tokens")
      .update({ redeemed_at: nowIso })
      .eq("install_id", cfg.install_id)
      .eq("nonce", result.payload.nonce);

    return { ok: true as const, entered_at: nowIso, payload: result.payload };
  });

export const exitRecoveryMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("platform_config")
      .update({
        recovery_mode: false,
        recovery_mode_since: null,
        recovery_mode_reason: null,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── DR scenarios list ──────────────────────────────────────────────────

export const listDrScenarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    return DR_SCENARIOS;
  });
