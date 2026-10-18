import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Execute the actual deployed trigger SQL, not a JavaScript approximation.
const db = new PGlite();
const migration = readFileSync("drizzle/migrations/0013_allow_unprivileged_kai_signup.sql", "utf8");
const profileMigration = readFileSync("drizzle/migrations/0014_allow_profiles_without_company.sql", "utf8");
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE TYPE public.app_role AS ENUM ('employee','admin','platform_admin','platform_owner','superadmin');
    CREATE TABLE public.profiles (id uuid primary key, full_name text, first_name text,
      last_name text, language_pref text, company_id uuid NOT NULL);
    CREATE TABLE public.user_roles (user_id uuid, role public.app_role, company_id uuid,
      is_platform_owner boolean default false, immutable_owner boolean default false,
      UNIQUE(user_id, role));
    CREATE TABLE public.platform_owner_allowlist (email text);
    CREATE TABLE auth.users (id uuid primary key, email text, raw_user_meta_data jsonb,
      raw_app_meta_data jsonb, invited_at timestamptz, email_confirmed_at timestamptz);
  `);
  await db.exec(migration);
  await db.exec(profileMigration);
  await db.exec(`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`);
}, 30_000);
afterAll(async () => { await db.close(); });

const company = "11111111-1111-4111-8111-111111111111";
async function signup(meta: Record<string, unknown> = {}, app: Record<string, unknown> = {}, invited = false, email = "visitor@example.test", confirmed = false) {
  const id = crypto.randomUUID();
  await db.query(`INSERT INTO auth.users VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, email, JSON.stringify(meta), JSON.stringify(app), invited ? new Date().toISOString() : null, confirmed ? new Date().toISOString() : null]);
  const profile = await db.query<{ company_id: string | null }>("SELECT company_id FROM public.profiles WHERE id=$1", [id]);
  const roles = await db.query<{ role: string }>("SELECT role FROM public.user_roles WHERE user_id=$1", [id]);
  return { companyId: profile.rows[0]?.company_id, roles: roles.rows.map(r => r.role) };
}

describe("public KAI signup authorization", () => {
  it("does not promote the first public visitor to owner", async () => {
    expect(await signup()).toEqual({ companyId: null, roles: [] });
  });
  it("allows subsequent email signup without invitation", async () => {
    expect(await signup()).toEqual({ companyId: null, roles: [] });
  });
  it("allows a confirmed Google signup without invitation", async () => {
    expect(await signup({ name: "Demo Visitor" }, { provider: "google" }, false, "google@example.test", true))
      .toEqual({ companyId: null, roles: [] });
  });
  it("ignores public company metadata", async () => {
    expect((await signup({ company_id: company })).companyId).toBeNull();
  });
  it("ignores a public role and a forged provisioning marker in user metadata", async () => {
    expect((await signup({ company_id: company, role: "superadmin", opsqai_provisioned: true })).roles).toEqual([]);
  });
  it("does not parse attacker-supplied invalid company or role values", async () => {
    expect(await signup({ company_id: "not-a-uuid", role: "invented" })).toEqual({ companyId: null, roles: [] });
  });
  it("preserves company and role for server-issued invitations", async () => {
    expect(await signup({ company_id: company, role: "admin" }, {}, true))
      .toEqual({ companyId: company, roles: ["admin"] });
  });
  it("preserves company and role for server-authorized account creation", async () => {
    expect(await signup({ company_id: company, role: "admin" }, { opsqai_provisioned: true }))
      .toEqual({ companyId: company, roles: ["admin"] });
  });
  it("does not assign platform roles from provisioning metadata", async () => {
    expect((await signup({ company_id: company, role: "superadmin" }, { opsqai_provisioned: true })).roles).toEqual([]);
  });
  it("does not promote an unconfirmed signup using an allowlisted email", async () => {
    await db.query("INSERT INTO public.platform_owner_allowlist VALUES ($1)", ["owner@example.test"]);
    expect((await signup({}, {}, false, "owner@example.test")).roles).toEqual([]);
  });
  it("preserves restoration for a verified allowlisted owner", async () => {
    expect((await signup({}, {}, false, "owner@example.test", true)).roles).toEqual(["platform_owner"]);
  });
});