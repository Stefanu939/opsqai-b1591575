import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth.server";
import { requirePlatformAdmin } from "@/lib/authorization";
import { z } from "zod";

export const listReleases = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data, error } = await context.supabase
      .from("license_releases")
      .select(
        "id, version, channel, docker_image, checksum, release_notes_url, min_supported, is_current, published_at, created_at",
      )
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CreateReleaseInput = z.object({
  version: z.string().min(1).max(64),
  channel: z.enum(["stable", "beta", "canary"]).default("stable"),
  docker_image: z.string().min(1).max(500),
  checksum: z.string().max(200).optional().nullable(),
  release_notes_url: z.string().url().optional().nullable(),
  min_supported: z.string().max(64).optional().nullable(),
  is_current: z.boolean().default(false),
  published_at: z.string().datetime().optional(),
});

export const createRelease = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CreateReleaseInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.is_current) {
      await supabaseAdmin
        .from("license_releases")
        .update({ is_current: false })
        .eq("channel", data.channel)
        .eq("is_current", true);
    }

    const { data: row, error } = await supabaseAdmin
      .from("license_releases")
      .insert({
        version: data.version,
        channel: data.channel,
        docker_image: data.docker_image,
        checksum: data.checksum ?? null,
        release_notes_url: data.release_notes_url ?? null,
        min_supported: data.min_supported ?? null,
        is_current: data.is_current,
        published_at: data.published_at ?? new Date().toISOString(),
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setCurrentRelease = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rel, error: relErr } = await supabaseAdmin
      .from("license_releases")
      .select("channel")
      .eq("id", data.id)
      .maybeSingle();
    if (relErr) throw new Error(relErr.message);
    if (!rel) throw new Error("Release not found");

    await supabaseAdmin
      .from("license_releases")
      .update({ is_current: false })
      .eq("channel", rel.channel)
      .eq("is_current", true);

    const { error } = await supabaseAdmin
      .from("license_releases")
      .update({ is_current: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRelease = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("license_releases")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listInstallations = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data: installs, error } = await context.supabase
      .from("license_installs")
      .select(
        "install_id, last_heartbeat_at, app_version, installer_version, user_count, ip_address, updated_at, created_at",
      )
      .order("last_heartbeat_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);

    const rows = installs ?? [];
    const ids = rows.map((r) => r.install_id);
    const { data: licenses } = ids.length
      ? await context.supabase
          .from("licenses")
          .select("install_id, company_name, tier, seats, revoked, suspended, expires_at")
          .eq("kind", "install")
          .in("install_id", ids)
      : { data: [] as Array<{ install_id: string; company_name: string; tier: string | null; seats: number | null; revoked: boolean; suspended: boolean; expires_at: string | null }> };

    const byId = new Map((licenses ?? []).map((l) => [l.install_id, l]));
    return rows.map((r) => ({
      ...r,
      license: byId.get(r.install_id) ?? null,
    }));
  });
