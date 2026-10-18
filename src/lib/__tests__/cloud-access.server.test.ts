import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  roles: [] as { role: string }[],
  profile: null as { company_id: string } | null,
  companies: [] as Record<string, unknown>[],
  licenses: [] as { install_id: string }[],
  roleError: null as { message: string } | null,
}));
vi.mock("@/lib/providers/not-available", () => {
  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    const result = () => {
      let rows: Record<string, unknown>[] = table === "user_roles" ? state.roles
        : table === "profiles" ? (state.profile ? [state.profile] : [])
        : table === "companies" ? state.companies : state.licenses;
      if (table === "companies") rows = rows.filter(r => filters.every(([k, v]) => Array.isArray(v) ? v.includes(r[k]) : r[k] === v));
      return { data: rows, error: table === "user_roles" ? state.roleError : null };
    };
    const q = {
      select: () => q,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return q; },
      in: (key: string, value: unknown[]) => { filters.push([key, value]); return q; },
      maybeSingle: async () => ({ ...result(), data: result().data[0] ?? null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return q;
  };
  return { getCloudSupabase: () => ({ from }), getCloudSupabaseAdmin: async () => ({ from }) };
});
import { readCloudAccess, requirePortalAccess } from "../cloud-access.server";

const context = { supabase: {} as Parameters<typeof readCloudAccess>[0]["supabase"], userId: "visitor", claims: { email: "visitor@example.test" } };
const company = { id: "enrolled", is_system: false, is_demo_tenant: false, owner_user_id: "staff", install_id: "install-1" };
beforeEach(() => {
  state.roles = []; state.profile = null; state.companies = []; state.licenses = []; state.roleError = null;
});
describe("authenticated Portal eligibility", () => {
  it("rejects a visitor's direct Portal request", async () => {
    await expect(requirePortalAccess(context)).rejects.toThrow("Portalul este disponibil doar clienților");
  });
  it("accepts the MC-created customer's protected company linkage", async () => {
    state.profile = { company_id: "enrolled" }; state.companies = [company];
    expect(await readCloudAccess(context)).toEqual({ isStaff: false, isCustomer: true });
  });
  it("accepts a licence contact only when its installation belongs to an MC company", async () => {
    state.licenses = [{ install_id: "install-1" }];
    expect((await readCloudAccess(context)).isCustomer).toBe(false);
    state.companies = [company];
    expect((await readCloudAccess(context)).isCustomer).toBe(true);
  });
  it("ignores a default company profile", async () => {
    state.profile = { company_id: "enrolled" }; state.companies = [{ ...company, is_system: true }];
    expect((await readCloudAccess(context)).isCustomer).toBe(false);
  });
  it("resolves staff from authorized roles", async () => {
    state.roles = [{ role: "platform_admin" }];
    expect(await requirePortalAccess(context)).toEqual({ isStaff: true, isCustomer: false });
  });
  it("fails closed if role checks fail", async () => {
    state.roleError = { message: "unavailable" };
    await expect(requirePortalAccess(context)).rejects.toThrow("verifica accesul");
  });
});