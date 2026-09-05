import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { z } from "zod";
import { uuidString } from "@/lib/zod-uuid";
import {
  ADDON_CATALOG,
  CORE_CAPABILITIES,
  PRODUCT_CATALOG,
  getCompanyProfile,
  isCompanyProfileKey,
  isProductKey,
  productsAvailableFor,
  productsRecommendedFor,
  resolveEffectiveConfig,
} from "@/lib/product-architecture";

const Uuid = uuidString();

/**
 * Single source of truth for writing explicit product enablement.
 *
 * Upserts the `company_products` rows and re-syncs the denormalised
 * `companies.enabled_products` array that the license entitlement payload and
 * the heartbeat read. Used by both customer creation and the Products tab.
 */
export async function applyCompanyProducts(
  admin: { from: (t: string) => any },
  companyId: string,
  changes: ReadonlyArray<{ product_key: string; enabled: boolean; notes?: string | null }>,
): Promise<string[]> {
  const valid = changes.filter((c) => isProductKey(c.product_key));
  if (valid.length) {
    const { error } = await admin.from("company_products").upsert(
      valid.map((c) => ({
        company_id: companyId,
        product_key: c.product_key,
        enabled: c.enabled,
        source: "management_center",
        notes: c.notes ?? null,
      })),
      { onConflict: "company_id,product_key" },
    );
    if (error) throw new Error(error.message);
  }

  const { data: rows, error: rErr } = await admin
    .from("company_products")
    .select("product_key, enabled")
    .eq("company_id", companyId);
  if (rErr) throw new Error(rErr.message);
  const enabled = ((rows ?? []) as Array<{ product_key: string; enabled: boolean }>)
    .filter((r) => r.enabled && isProductKey(r.product_key))
    .map((r) => r.product_key);
  const { error: uErr } = await admin
    .from("companies")
    .update({ enabled_products: enabled })
    .eq("id", companyId);
  if (uErr) throw new Error(uErr.message);
  return enabled;
}


/**
 * Company Profile + explicitly enabled OPSQAI Products for one company.
 *
 * A profile NEVER activates products: it only reports recommended/available
 * ones. Products become real only when Management Center enables them here.
 */
export const getCompanyArchitecture = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ company_id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    {
      const { assertCompanyInScope } = await import("@/lib/mc-scope.server");
      await assertCompanyInScope(context, data.company_id);
    }
    const admin = await getCloudSupabaseAdmin("company-products");

    const [{ data: company, error: cErr }, { data: rows, error: pErr }] = await Promise.all([
      admin
        .from("companies")
        .select("id, name, business_type, enabled_products")
        .eq("id", data.company_id)
        .maybeSingle(),
      admin
        .from("company_products")
        .select("product_key, enabled, source, notes, updated_at")
        .eq("company_id", data.company_id),
    ]);
    if (cErr) throw new Error(cErr.message);
    if (pErr) throw new Error(pErr.message);
    if (!company) throw new Error("Company not found");

    const enabled = (rows ?? []).filter((r) => r.enabled).map((r) => r.product_key);
    const profile = getCompanyProfile(company.business_type).key;
    const effective = resolveEffectiveConfig({ profile, enabledProducts: enabled });

    return {
      company_id: company.id,
      company_name: company.name,
      profile,
      profile_label: getCompanyProfile(profile).label,
      enabled_products: effective.products,
      available_products: productsAvailableFor(profile),
      recommended_products: productsRecommendedFor(profile),
      product_rows: rows ?? [],
      core_capabilities: CORE_CAPABILITIES.map((c) => ({
        key: c.key,
        label: c.label,
        area: c.area,
      })),
      addons: ADDON_CATALOG.map((a) => ({ key: a.key, label: a.label })),
      catalog: PRODUCT_CATALOG.map((p) => ({
        key: p.key,
        label: p.label,
        domain: p.domain,
        status: p.status,
        description: p.description,
      })),
    };
  });

export const setCompanyProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: Uuid, business_type: z.string().min(1).max(64) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    {
      const { assertCompanyInScope } = await import("@/lib/mc-scope.server");
      await assertCompanyInScope(context, data.company_id);
    }
    if (!isCompanyProfileKey(data.business_type)) throw new Error("Unknown company profile");
    const admin = await getCloudSupabaseAdmin("company-products");
    const { error } = await admin
      .from("companies")
      .update({ business_type: data.business_type })
      .eq("id", data.company_id);
    if (error) throw new Error(error.message);
    // Changing a profile never enables or disables a product.
    return { ok: true, profile: data.business_type };
  });

export const setCompanyProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: Uuid,
        product_key: z.string().min(1).max(64),
        enabled: z.boolean(),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    {
      const { assertCompanyInScope } = await import("@/lib/mc-scope.server");
      await assertCompanyInScope(context, data.company_id);
    }
    if (!isProductKey(data.product_key)) throw new Error("Unknown OPSQAI product");
    const admin = await getCloudSupabaseAdmin("company-products");

    const enabled = await applyCompanyProducts(admin as never, data.company_id, [
      { product_key: data.product_key, enabled: data.enabled, notes: data.notes ?? null },
    ]);


    return { ok: true, enabled_products: enabled };
  });
