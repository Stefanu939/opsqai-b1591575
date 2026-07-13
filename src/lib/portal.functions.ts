// Phase 6.5 — Customer Portal server functions.
//
// The Customer Portal is intentionally narrow: downloads, contract summary,
// tickets, release notes. It is NOT the Management Center.
//
// A customer sees licenses whose `contact_email` matches their auth email.
// This is a soft binding — a proper company_id link can be added later
// without a schema change (extend-first rule).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** All licenses (install + module) tied to the current user's email. */
export const getMyPortalOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    if (!email) return { email: null, installs: [] as PortalInstall[] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("licenses")
      .select(
        "install_id, company_name, kind, module_key, seats, expires_at, maintenance_expires_at, revoked, suspended, owner_type, issued_at",
      )
      .eq("contact_email", email)
      .order("issued_at", { ascending: false });

    const byInstall = new Map<string, PortalInstall>();
    for (const r of rows ?? []) {
      const existing = byInstall.get(r.install_id) ?? {
        install_id: r.install_id,
        company_name: r.company_name,
        owner_type: r.owner_type,
        install_license: null,
        module_licenses: [],
      };
      if (r.kind === "install") {
        existing.install_license = {
          seats: r.seats,
          expires_at: r.expires_at,
          maintenance_expires_at: r.maintenance_expires_at,
          revoked: r.revoked,
          suspended: r.suspended,
        };
      } else if (r.kind === "module" && r.module_key) {
        existing.module_licenses.push({
          module_key: r.module_key,
          expires_at: r.expires_at,
          maintenance_expires_at: r.maintenance_expires_at,
          revoked: r.revoked,
          suspended: r.suspended,
        });
      }
      byInstall.set(r.install_id, existing);
    }
    return { email, installs: Array.from(byInstall.values()) };
  });

export interface PortalInstall {
  install_id: string;
  company_name: string;
  owner_type: string;
  install_license: null | {
    seats: number | null;
    expires_at: string | null;
    maintenance_expires_at: string | null;
    revoked: boolean;
    suspended: boolean;
  };
  module_licenses: Array<{
    module_key: string;
    expires_at: string | null;
    maintenance_expires_at: string | null;
    revoked: boolean;
    suspended: boolean;
  }>;
}

/** Public release list. Only the release manifest metadata — no secrets. */
export const listPortalReleases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ channel: z.string().max(32).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const query = context.supabase
      .from("license_releases")
      .select(
        "version, channel, docker_image, checksum, min_supported, published_at, release_notes_url, is_current",
      )
      .order("published_at", { ascending: false })
      .limit(50);
    if (data.channel) query.eq("channel", data.channel);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const DownloadInput = z.object({ install_id: z.string().min(3).max(64) });

/**
 * Ownership-checked activation-bundle export. Confirms the caller's email
 * matches the license contact before delegating to the MC bundle exporter.
 */
export const downloadMyActivationBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DownloadInput.parse(d))
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    if (!email) throw new Error("No email on session");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owner } = await supabaseAdmin
      .from("licenses")
      .select("install_id")
      .eq("install_id", data.install_id)
      .eq("contact_email", email)
      .eq("kind", "install")
      .maybeSingle();
    if (!owner) throw new Error("Not authorized for this install_id");

    const { buildActivationBundle } = await import("@/lib/license-activation-core.server");
    return buildActivationBundle(data.install_id);
  });
