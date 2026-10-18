import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getCloudSupabase, getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { isEnrolledCustomerCompany, type CloudAccess } from "@/lib/cloud-access";

type AccessContext = { supabase: SupabaseClient<Database>; userId: string; claims?: unknown };
const COMPANY_FIELDS = "id, is_system, is_demo_tenant, owner_user_id, install_id";

/** Only protected profile linkage or a licence contact bound to an MC company qualifies. */
export async function readCloudAccess(context: AccessContext): Promise<CloudAccess> {
  const db = getCloudSupabase(context, "portal");
  const [{ data: roles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", context.userId),
    db.from("profiles").select("company_id").eq("id", context.userId).maybeSingle(),
  ]);
  if (rolesError || profileError) throw new Error("Nu am putut verifica accesul contului. Încearcă din nou.");
  const isStaff = (roles ?? []).some(r => r.role === "platform_owner" || r.role === "platform_admin");
  if (isStaff) return { isStaff: true, isCustomer: false };

  // Privileged, narrow lookup after bearer validation: never expose customer rows to the caller.
  const admin = await getCloudSupabaseAdmin("portal");
  if (profile?.company_id) {
    const { data: company, error } = await admin.from("companies").select(COMPANY_FIELDS)
      .eq("id", profile.company_id).maybeSingle();
    if (error) throw new Error("Nu am putut verifica accesul la Portal.");
    if (isEnrolledCustomerCompany(company)) return { isStaff: false, isCustomer: true };
  }
  const email = (context.claims as { email?: string } | undefined)?.email;
  if (email) {
    const { data: licenses, error } = await admin.from("licenses").select("install_id")
      .eq("contact_email", email).eq("kind", "install");
    if (error) throw new Error("Nu am putut verifica accesul la Portal.");
    const ids = [...new Set((licenses ?? []).map(r => r.install_id))];
    if (ids.length) {
      const { data: companies, error: companyError } = await admin.from("companies")
        .select(COMPANY_FIELDS).in("install_id", ids);
      if (companyError) throw new Error("Nu am putut verifica accesul la Portal.");
      if ((companies ?? []).some(isEnrolledCustomerCompany)) return { isStaff: false, isCustomer: true };
    }
  }
  return { isStaff: false, isCustomer: false };
}

export async function requirePortalAccess(context: AccessContext) {
  const access = await readCloudAccess(context);
  if (!access.isStaff && !access.isCustomer) throw new Error("Portalul este disponibil doar clienților înrolați de OPSQAI. Poți continua cu Kai.");
  return access;
}